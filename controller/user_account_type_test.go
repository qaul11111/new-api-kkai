package controller

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupUserAccountTypeRegistrationTest(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf(
		"file:user-account-type-%d?mode=memory&cache=shared",
		time.Now().UnixNano(),
	)), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}))

	originalDB := model.DB
	originalRegisterEnabled := common.RegisterEnabled
	originalPasswordRegisterEnabled := common.PasswordRegisterEnabled
	originalEmailVerificationEnabled := common.EmailVerificationEnabled
	originalQuotaForNewUser := common.QuotaForNewUser
	originalQuotaForInviter := common.QuotaForInviter
	originalQuotaForInvitee := common.QuotaForInvitee
	originalGenerateDefaultToken := constant.GenerateDefaultToken
	originalRedisEnabled := common.RedisEnabled

	model.DB = db
	common.RegisterEnabled = true
	common.PasswordRegisterEnabled = true
	common.EmailVerificationEnabled = false
	common.QuotaForNewUser = 0
	common.QuotaForInviter = 0
	common.QuotaForInvitee = 0
	constant.GenerateDefaultToken = false
	common.RedisEnabled = false
	gin.SetMode(gin.TestMode)

	t.Cleanup(func() {
		model.DB = originalDB
		common.RegisterEnabled = originalRegisterEnabled
		common.PasswordRegisterEnabled = originalPasswordRegisterEnabled
		common.EmailVerificationEnabled = originalEmailVerificationEnabled
		common.QuotaForNewUser = originalQuotaForNewUser
		common.QuotaForInviter = originalQuotaForInviter
		common.QuotaForInvitee = originalQuotaForInvitee
		constant.GenerateDefaultToken = originalGenerateDefaultToken
		common.RedisEnabled = originalRedisEnabled
	})
	return db
}

func registerAccountTypeRequest(t *testing.T, body string) map[string]any {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/user/register", strings.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")

	Register(ctx)

	var response map[string]any
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
	return response
}

func TestRegisterPersistsAccountTypeAndIgnoresPrivilegedUserFields(t *testing.T) {
	db := setupUserAccountTypeRegistrationTest(t)
	response := registerAccountTypeRequest(t, `{
  "username":"business@example.com",
  "password":"password123",
  "account_type":"business",
  "role":100,
  "group":"private"
}`)
	require.Equal(t, true, response["success"])

	var user model.User
	require.NoError(t, db.Where("username = ?", "business@example.com").Take(&user).Error)
	require.Equal(t, common.AccountTypeBusiness, user.AccountType)
	require.Equal(t, common.RoleCommonUser, user.Role)
	require.Equal(t, "default", user.Group)
}

func TestRegisterDefaultsOmittedAccountTypeToConsumer(t *testing.T) {
	db := setupUserAccountTypeRegistrationTest(t)
	response := registerAccountTypeRequest(t, `{
  "username":"consumer@example.com",
  "password":"password123"
}`)
	require.Equal(t, true, response["success"])

	var user model.User
	require.NoError(t, db.Where("username = ?", "consumer@example.com").Take(&user).Error)
	require.Equal(t, common.AccountTypeConsumer, user.AccountType)
}

func TestRegisterRejectsUnknownAccountType(t *testing.T) {
	db := setupUserAccountTypeRegistrationTest(t)
	response := registerAccountTypeRequest(t, `{
  "username":"partner@example.com",
  "password":"password123",
  "account_type":"partner"
}`)
	require.Equal(t, false, response["success"])

	var count int64
	require.NoError(t, db.Model(&model.User{}).Count(&count).Error)
	require.Zero(t, count)
}
