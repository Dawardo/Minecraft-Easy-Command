"""Encryption for Minecraft Bedrock's WebSocket protocol (the "Require Encrypted Websockets" option).

Handshake (same as Microsoft's Code Connection / the mcpews library):
  1. Server sends the command:  enableencryption "<server SPKI pubkey b64>" "<salt b64>" cfb8
  2. Client answers (in plain text) with body.publicKey = its SPKI public key (b64), then switches.
  3. Both sides: secret = ECDH(secp384r1); key = SHA256(salt + secret); iv = key[:16]
  4. Every later message is AES-256-CFB8 encrypted as ONE continuous stream per direction.

Uses the `cryptography` package when installed; otherwise a pure-Python fallback
(slower, but needs nothing installed). Both are checked against each other in the tests.
"""
from __future__ import annotations

import base64
import hashlib
import os

# DER header of a SubjectPublicKeyInfo for an uncompressed secp384r1 point (+ 97 point bytes = 120 bytes)
SPKI_P384_PREFIX = bytes.fromhex("3076301006072a8648ce3d020106052b81040022036200")

HAVE_CRYPTOGRAPHY = False  # fast ECDH available
_FAST_CFB8 = None  # fast AES-CFB8 mode class, if available
try:  # optional fast path
    from cryptography.hazmat.primitives import serialization as _ser
    from cryptography.hazmat.primitives.asymmetric import ec as _ec
    from cryptography.hazmat.primitives.ciphers import Cipher as _Cipher, algorithms as _alg
    HAVE_CRYPTOGRAPHY = True
    try:  # CFB8 moved to the "decrepit" module in newer releases
        from cryptography.hazmat.decrepit.ciphers.modes import CFB8 as _FAST_CFB8
    except BaseException:
        from cryptography.hazmat.primitives.ciphers.modes import CFB8 as _FAST_CFB8
except BaseException as _e:  # a broken install can raise pyo3's PanicException (a BaseException)
    if isinstance(_e, (KeyboardInterrupt, SystemExit)):
        raise

# ---------------------------------------------------------------- P-384 (pure Python)
_P = 2**384 - 2**128 - 2**96 + 2**32 - 1
_A = _P - 3
_B = 0xB3312FA7E23EE7E4988E056BE3F82D19181D9C6EFE8141120314088F5013875AC656398D8A2ED19D2A85C8EDD3EC2AEF
_GX = 0xAA87CA22BE8B05378EB1C71EF320AD746E1D3B628BA79B9859F741E082542A385502F25DBF55296C3A545E3872760AB7
_GY = 0x3617DE4A96262C6F5D9E98BF9292DC29F8F41DBD289A147CE9DA3113B5F0B8C00A60B1CE1D7E819D7A431D7C90EA0E5F
_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC7634D81F4372DDF581A0DB248B0A77AECEC196ACCC52973


def _jdouble(X, Y, Z):
    if not Y:
        return 0, 1, 0
    p = _P
    YY = Y * Y % p
    S = 4 * X * YY % p
    ZZ = Z * Z % p
    M = 3 * (X - ZZ) * (X + ZZ) % p  # a = -3
    X3 = (M * M - 2 * S) % p
    Y3 = (M * (S - X3) - 8 * YY * YY) % p
    Z3 = 2 * Y * Z % p
    return X3, Y3, Z3


def _jadd(X1, Y1, Z1, X2, Y2, Z2):
    if not Z1:
        return X2, Y2, Z2
    if not Z2:
        return X1, Y1, Z1
    p = _P
    Z1Z1 = Z1 * Z1 % p
    Z2Z2 = Z2 * Z2 % p
    U1 = X1 * Z2Z2 % p
    U2 = X2 * Z1Z1 % p
    S1 = Y1 * Z2 * Z2Z2 % p
    S2 = Y2 * Z1 * Z1Z1 % p
    if U1 == U2:
        return _jdouble(X1, Y1, Z1) if S1 == S2 else (0, 1, 0)
    H = (U2 - U1) % p
    R = (S2 - S1) % p
    HH = H * H % p
    HHH = H * HH % p
    V = U1 * HH % p
    X3 = (R * R - HHH - 2 * V) % p
    Y3 = (R * (V - X3) - S1 * HHH) % p
    Z3 = Z1 * Z2 * H % p
    return X3, Y3, Z3


def _scalar_mult(k, x, y):
    RX, RY, RZ = 0, 1, 0
    QX, QY, QZ = x, y, 1
    while k:
        if k & 1:
            RX, RY, RZ = _jadd(RX, RY, RZ, QX, QY, QZ)
        QX, QY, QZ = _jdouble(QX, QY, QZ)
        k >>= 1
    if not RZ:
        raise ValueError("point at infinity")
    zi = pow(RZ, -1, _P)
    zi2 = zi * zi % _P
    return RX * zi2 % _P, RY * zi2 * zi % _P


def _on_curve(x, y):
    return 0 <= x < _P and 0 <= y < _P and (y * y - (x * x * x + _A * x + _B)) % _P == 0


def _encode_point(x, y) -> bytes:
    return SPKI_P384_PREFIX + b"\x04" + x.to_bytes(48, "big") + y.to_bytes(48, "big")


def _decode_spki(b64: str):
    der = base64.b64decode(b64)
    if not der.startswith(SPKI_P384_PREFIX) or len(der) != len(SPKI_P384_PREFIX) + 97:
        raise ValueError("not an uncompressed secp384r1 SubjectPublicKeyInfo")
    pt = der[len(SPKI_P384_PREFIX):]
    x, y = int.from_bytes(pt[1:49], "big"), int.from_bytes(pt[49:], "big")
    if not _on_curve(x, y):
        raise ValueError("public key is not on secp384r1")
    return x, y


class ECDHKey:
    """An ephemeral secp384r1 key. `public_b64` is the SPKI DER in base64 (what Minecraft expects)."""

    def __init__(self, backend: str | None = None):
        self.backend = backend or ("cryptography" if HAVE_CRYPTOGRAPHY else "python")
        if self.backend == "cryptography":
            self._priv = _ec.generate_private_key(_ec.SECP384R1())
            der = self._priv.public_key().public_bytes(_ser.Encoding.DER, _ser.PublicFormat.SubjectPublicKeyInfo)
        else:
            self._d = int.from_bytes(os.urandom(48), "big") % (_N - 1) + 1
            der = _encode_point(*_scalar_mult(self._d, _GX, _GY))
        self.public_b64 = base64.b64encode(der).decode()

    def shared_secret(self, peer_public_b64: str) -> bytes:
        if self.backend == "cryptography":
            peer = _ser.load_der_public_key(base64.b64decode(peer_public_b64))
            return self._priv.exchange(_ec.ECDH(), peer)
        x, y = _decode_spki(peer_public_b64)
        return _scalar_mult(self._d, x, y)[0].to_bytes(48, "big")


def derive_key(salt: bytes, secret: bytes):
    key = hashlib.sha256(salt + secret).digest()
    return key, key[:16]


# ---------------------------------------------------------------- AES-256 (pure Python)
def _build_tables():
    sbox = [0] * 256
    p = q = 1
    while True:  # walk GF(2^8) with generator 3 to get multiplicative inverses
        p = p ^ ((p << 1) & 0xFF) ^ (0x1B if p & 0x80 else 0)
        q ^= q << 1
        q ^= q << 2
        q ^= q << 4
        q &= 0xFF
        if q & 0x80:
            q ^= 0x09
        x = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) ^ ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4))
        sbox[p] = (x ^ 0x63) & 0xFF
        if p == 1:
            break
    sbox[0] = 0x63

    def xt(a):
        return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1

    te0, te1, te2, te3 = [0] * 256, [0] * 256, [0] * 256, [0] * 256
    for i in range(256):
        s = sbox[i]
        s2, s3 = xt(s), xt(s) ^ s
        w = (s2 << 24) | (s << 16) | (s << 8) | s3
        te0[i] = w
        te1[i] = ((w >> 8) | (w << 24)) & 0xFFFFFFFF
        te2[i] = ((w >> 16) | (w << 16)) & 0xFFFFFFFF
        te3[i] = ((w >> 24) | (w << 8)) & 0xFFFFFFFF
    return sbox, te0, te1, te2, te3


_SBOX, _TE0, _TE1, _TE2, _TE3 = _build_tables()


def _expand_key_256(key: bytes):
    nk, nr = 8, 14
    w = [int.from_bytes(key[4 * i:4 * i + 4], "big") for i in range(nk)]
    rcon = 1
    for i in range(nk, 4 * (nr + 1)):
        t = w[i - 1]
        if i % nk == 0:
            t = ((t << 8) | (t >> 24)) & 0xFFFFFFFF
            t = (_SBOX[t >> 24] << 24) | (_SBOX[(t >> 16) & 255] << 16) | (_SBOX[(t >> 8) & 255] << 8) | _SBOX[t & 255]
            t ^= rcon << 24
            rcon = ((rcon << 1) ^ 0x1B) & 0xFF if rcon & 0x80 else rcon << 1
        elif i % nk == 4:
            t = (_SBOX[t >> 24] << 24) | (_SBOX[(t >> 16) & 255] << 16) | (_SBOX[(t >> 8) & 255] << 8) | _SBOX[t & 255]
        w.append(w[i - nk] ^ t)
    return w


class _PyCFB8:
    """AES-256-CFB8 stream (one direction). Only the first byte of each block encryption is needed."""

    def __init__(self, key: bytes, iv: bytes, decrypt: bool):
        self.rk = _expand_key_256(key)
        self.reg = int.from_bytes(iv, "big")
        self.decrypt = decrypt

    def update(self, data: bytes) -> bytes:
        rk, reg, dec = self.rk, self.reg, self.decrypt
        T0, T1, T2, T3, S = _TE0, _TE1, _TE2, _TE3, _SBOX
        last = rk[56] >> 24
        mask128 = (1 << 128) - 1
        out = bytearray(len(data))
        for i, b in enumerate(data):
            s0 = (reg >> 96) ^ rk[0]
            s1 = ((reg >> 64) & 0xFFFFFFFF) ^ rk[1]
            s2 = ((reg >> 32) & 0xFFFFFFFF) ^ rk[2]
            s3 = (reg & 0xFFFFFFFF) ^ rk[3]
            k = 4
            for _ in range(13):
                t0 = T0[s0 >> 24] ^ T1[(s1 >> 16) & 255] ^ T2[(s2 >> 8) & 255] ^ T3[s3 & 255] ^ rk[k]
                t1 = T0[s1 >> 24] ^ T1[(s2 >> 16) & 255] ^ T2[(s3 >> 8) & 255] ^ T3[s0 & 255] ^ rk[k + 1]
                t2 = T0[s2 >> 24] ^ T1[(s3 >> 16) & 255] ^ T2[(s0 >> 8) & 255] ^ T3[s1 & 255] ^ rk[k + 2]
                t3 = T0[s3 >> 24] ^ T1[(s0 >> 16) & 255] ^ T2[(s1 >> 8) & 255] ^ T3[s2 & 255] ^ rk[k + 3]
                s0, s1, s2, s3 = t0, t1, t2, t3
                k += 4
            c = b ^ S[s0 >> 24] ^ last
            out[i] = c
            reg = ((reg << 8) & mask128) | (b if dec else c)
        self.reg = reg
        return bytes(out)


class StreamCipher:
    """Both directions of an encrypted session: `encrypt()` for sending, `decrypt()` for receiving."""

    def __init__(self, key: bytes, iv: bytes, backend: str | None = None):
        self.backend = backend or ("cryptography" if _FAST_CFB8 is not None else "python")
        if self.backend == "cryptography":
            c = _Cipher(_alg.AES(key), _FAST_CFB8(iv))
            self._enc, self._dec = c.encryptor(), c.decryptor()
        else:
            self._enc, self._dec = _PyCFB8(key, iv, False), _PyCFB8(key, iv, True)

    def encrypt(self, data: bytes) -> bytes:
        return self._enc.update(data)

    def decrypt(self, data: bytes) -> bytes:
        return self._dec.update(data)
