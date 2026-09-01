package dto

type RegisterRequest struct {
	Username         string `json:"username" validate:"max=20"`
	Password         string `json:"password" validate:"min=8,max=20"`
	Email            string `json:"email" validate:"max=50"`
	VerificationCode string `json:"verification_code"`
	AffCode          string `json:"aff_code"`
	AccountType      string `json:"account_type"`
}

type UpdateAccountTypeRequest struct {
	AccountType string `json:"account_type"`
}
