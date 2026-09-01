package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

func SearchUsers(c *gin.Context) {
	keyword := c.Query("keyword")
	group := c.Query("group")
	accountType := strings.TrimSpace(c.Query("account_type"))
	if accountType != "" {
		var valid bool
		accountType, valid = common.NormalizeAccountType(accountType)
		if !valid {
			common.ApiErrorI18n(c, i18n.MsgInvalidParams)
			return
		}
	}
	var role *int
	if roleStr := c.Query("role"); roleStr != "" {
		if parsed, err := strconv.Atoi(roleStr); err == nil {
			role = &parsed
		}
	}
	var status *int
	if statusStr := c.Query("status"); statusStr != "" {
		if parsed, err := strconv.Atoi(statusStr); err == nil {
			status = &parsed
		}
	}
	pageInfo := common.GetPageQuery(c)
	users, total, err := model.SearchUsers(keyword, group, accountType, role, status, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(users)
	common.ApiSuccess(c, pageInfo)
}

func UpdateUserAccountType(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	var request dto.UpdateAccountTypeRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	accountType, valid := common.NormalizeAccountType(request.AccountType)
	if !valid || strings.TrimSpace(request.AccountType) == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	user, err := model.GetUserById(id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !canManageTargetRole(c.GetInt("role"), user.Role) {
		common.ApiErrorI18n(c, i18n.MsgUserNoPermissionHigherLevel)
		return
	}
	previous := common.EffectiveAccountType(user.AccountType)
	if err := model.UpdateUserAccountType(id, accountType); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.InvalidateUserCache(id); err != nil {
		common.SysLog(fmt.Sprintf("failed to invalidate user cache for user %d: %s", id, err.Error()))
	}
	if err := model.InvalidateUserTokensCache(id); err != nil {
		common.SysLog(fmt.Sprintf("failed to invalidate tokens cache for user %d: %s", id, err.Error()))
	}
	recordManageAuditFor(c, id, "user.account_type.update", map[string]interface{}{
		"from": previous,
		"to":   accountType,
	})
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"id":           id,
			"account_type": accountType,
		},
	})
}
