package common

import "strings"

const (
	AccountTypeConsumer = "consumer"
	AccountTypeBusiness = "business"
)

// NormalizeAccountType canonicalizes an account type received at a trust
// boundary. An omitted value remains backward compatible and becomes the
// least-privileged consumer account type.
func NormalizeAccountType(value string) (string, bool) {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return AccountTypeConsumer, true
	}
	if normalized != AccountTypeConsumer && normalized != AccountTypeBusiness {
		return "", false
	}
	return normalized, true
}

func IsValidAccountType(value string) bool {
	_, valid := NormalizeAccountType(value)
	return valid && strings.TrimSpace(value) != ""
}

// EffectiveAccountType is intended for authorization paths. Corrupt or
// unknown persisted values fail closed to the consumer policy.
func EffectiveAccountType(value string) string {
	normalized, valid := NormalizeAccountType(value)
	if !valid {
		return AccountTypeConsumer
	}
	return normalized
}
