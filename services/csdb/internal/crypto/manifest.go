package crypto

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/hex"
	"errors"
)

// ManifestPublicKeyHex exposes the broker's manifest signing public key for offline verification.
const ManifestPublicKeyHex = "4221c3a1973b719b5be3f08b0795e84d4a6bf78f11566d10d9dc698c7b80a1cc"

var (
	errInvalidPrivateKey = errors.New("manifest signer requires a 64 byte ed25519 private key")
	errInvalidPublicKey  = errors.New("manifest signer requires a 32 byte ed25519 public key")
)

type ManifestSigner struct {
	private ed25519.PrivateKey
	public  ed25519.PublicKey
}

func NewManifestSigner(privateKey, publicKey []byte) (*ManifestSigner, error) {
	if len(privateKey) != ed25519.PrivateKeySize {
		return nil, errInvalidPrivateKey
	}
	if len(publicKey) != ed25519.PublicKeySize {
		return nil, errInvalidPublicKey
	}
	signer := &ManifestSigner{
		private: ed25519.PrivateKey(make([]byte, ed25519.PrivateKeySize)),
		public:  ed25519.PublicKey(make([]byte, ed25519.PublicKeySize)),
	}
	copy(signer.private, privateKey)
	copy(signer.public, publicKey)
	return signer, nil
}

func (s *ManifestSigner) Sign(data []byte) (string, error) {
	if s == nil {
		return "", errors.New("nil manifest signer")
	}
	sig := ed25519.Sign(s.private, data)
	return base64.StdEncoding.EncodeToString(sig), nil
}

func (s *ManifestSigner) Verify(data []byte, signature string) (bool, error) {
	sigBytes, err := base64.StdEncoding.DecodeString(signature)
	if err != nil {
		return false, err
	}
	if len(sigBytes) != ed25519.SignatureSize {
		return false, errors.New("invalid signature length")
	}
	return ed25519.Verify(s.public, data, sigBytes), nil
}

func (s *ManifestSigner) PublicKeyHex() string {
	return hex.EncodeToString(s.public)
}
