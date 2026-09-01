package common

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizeAccountType(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
		valid    bool
	}{
		{name: "omitted defaults to consumer", expected: AccountTypeConsumer, valid: true},
		{name: "normalizes consumer", input: " Consumer ", expected: AccountTypeConsumer, valid: true},
		{name: "normalizes business", input: "BUSINESS", expected: AccountTypeBusiness, valid: true},
		{name: "rejects unknown", input: "partner", valid: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			actual, valid := NormalizeAccountType(test.input)
			require.Equal(t, test.valid, valid)
			require.Equal(t, test.expected, actual)
		})
	}
}

func TestEffectiveAccountTypeFailsClosed(t *testing.T) {
	require.Equal(t, AccountTypeConsumer, EffectiveAccountType("partner"))
	require.Equal(t, AccountTypeBusiness, EffectiveAccountType(AccountTypeBusiness))
}
