import base64

from cryptography.hazmat.primitives.asymmetric import ec


def _b64url_nopad(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def main() -> None:
    # VAPID uses the P-256 (prime256v1 / secp256r1) curve.
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_numbers = private_key.private_numbers()
    public_numbers = private_numbers.public_numbers

    # Public key for PushManager.subscribe(): 65 bytes (0x04 + X(32) + Y(32))
    x = int(public_numbers.x).to_bytes(32, "big")
    y = int(public_numbers.y).to_bytes(32, "big")
    public_key_bytes = b"\x04" + x + y

    # Private key: 32-byte integer (the "d" value)
    private_key_bytes = int(private_numbers.private_value).to_bytes(32, "big")

    print("VAPID_PUBLIC_KEY=" + _b64url_nopad(public_key_bytes))
    print("VAPID_PRIVATE_KEY=" + _b64url_nopad(private_key_bytes))
    print('VAPID_SUBJECT="mailto:you@example.com"')


if __name__ == "__main__":
    main()

