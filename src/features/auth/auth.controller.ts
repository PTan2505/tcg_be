import { Context } from "hono";
import { MESSAGES, createErrorResponse, createSuccessResponse } from "../../shared/constants/messages";
import { IAuthService } from "./auth.service";

export class AuthController {
  constructor(private authService: IAuthService) {}

  register = async (c: Context) => {
    try {
      const data = c.get("validatedData");
      const user = await this.authService.register(data);
      console.log("Registered user:", user);

      return c.json(
        {
          success: true,
          message: MESSAGES.AUTH.REGISTER_SUCCESS,
          user: user.toJSON(),
        },
        201
      );
    } catch (error: any) {
      return c.json(createErrorResponse(error?.message || MESSAGES.AUTH.REGISTER_FAILED), 400);
    }
  };

  login = async (c: Context) => {
    try {
      const data = c.get("validatedData");
      const tokens = await this.authService.login(data);
      return c.json(createSuccessResponse(tokens));
    } catch (error: any) {
      return c.json(createErrorResponse(error?.message || MESSAGES.AUTH.LOGIN_FAILED), 400);
    }
  };

  verifyEmailWithOTP = async (c: Context) => {
    try {
      const { email, otp } = c.get("validatedData");
      await this.authService.verifyEmailWithOTP(email, otp);
      return c.json({ 
        success: true,
        message: MESSAGES.AUTH.EMAIL_VERIFICATION_SUCCESS 
      });
    } catch (error: any) {
      return c.json(
        createErrorResponse(error?.message || MESSAGES.AUTH.EMAIL_VERIFICATION_FAILED),
        400
      );
    }
  };

  resendEmailVerificationOTP = async (c: Context) => {
    try {
      const { email } = c.get("validatedData");
      await this.authService.resendEmailVerificationOTP(email);
      return c.json({ 
        success: true,
        message: MESSAGES.AUTH.OTP_RESENT 
      });
    } catch (error: any) {
      return c.json(
        createErrorResponse(error?.message || MESSAGES.AUTH.OTP_RESEND_FAILED),
        400
      );
    }
  };

  forgotPassword = async (c: Context) => {
    try {
      const { email } = c.get("validatedData");
      await this.authService.forgotPassword(email);
      return c.json({
        success: true,
        message: MESSAGES.AUTH.FORGOT_PASSWORD_SUCCESS,
      });
    } catch (error: any) {
      return c.json(createErrorResponse(MESSAGES.AUTH.FORGOT_PASSWORD_FAILED), 400);
    }
  };

  resetPasswordWithOTP = async (c: Context) => {
    try {
      const { email, otp, newPassword } = c.get("validatedData");
      await this.authService.resetPasswordWithOTP(email, otp, newPassword);
      return c.json({ 
        success: true,
        message: MESSAGES.AUTH.RESET_PASSWORD_SUCCESS 
      });
    } catch (error: any) {
      return c.json(
        createErrorResponse(error?.message || MESSAGES.AUTH.RESET_PASSWORD_FAILED),
        400
      );
    }
  };

  refreshToken = async (c: Context) => {
    try {
      const { refreshToken } = c.get("validatedData");
      const tokens = await this.authService.refreshToken(refreshToken);
      return c.json(tokens);
    } catch (error: any) {
      return c.json(
        createErrorResponse(error?.message || MESSAGES.AUTH.TOKEN_REFRESH_FAILED),
        401
      );
    }
  };
}
