import { Context } from "hono";
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
          message:
            "Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP xác thực tài khoản.",
          user: user.toJSON(),
        },
        201
      );
    } catch (error: any) {
      return c.json({ 
        success: false, 
        error: error?.message || "Registration failed" 
      }, 400);
    }
  };

  login = async (c: Context) => {
    try {
      const data = c.get("validatedData");
      const tokens = await this.authService.login(data);
      return c.json({
        success: true,
        data: tokens
      });
    } catch (error: any) {
      return c.json({ 
        success: false, 
        error: error?.message || "Login failed" 
      }, 400);
    }
  };

  verifyEmailWithOTP = async (c: Context) => {
    try {
      const { email, otp } = c.get("validatedData");
      await this.authService.verifyEmailWithOTP(email, otp);
      return c.json({ 
        success: true,
        message: "Xác thực email thành công" 
      });
    } catch (error: any) {
      return c.json(
        { 
          success: false,
          error: error?.message || "Xác thực email thất bại" 
        },
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
        message: "Mã OTP mới đã được gửi đến email của bạn" 
      });
    } catch (error: any) {
      return c.json(
        { 
          success: false,
          error: error?.message || "Không thể gửi lại mã OTP" 
        },
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
        message: "Nếu email tồn tại, mã OTP đã được gửi đến hộp thư của bạn",
      });
    } catch (error: any) {
      return c.json({ 
        success: false, 
        error: "Không thể xử lý yêu cầu" 
      }, 400);
    }
  };

  resetPasswordWithOTP = async (c: Context) => {
    try {
      const { email, otp, newPassword } = c.get("validatedData");
      await this.authService.resetPasswordWithOTP(email, otp, newPassword);
      return c.json({ 
        success: true,
        message: "Đặt lại mật khẩu thành công" 
      });
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error?.message || "Đặt lại mật khẩu thất bại",
        },
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
        {
          error: error?.message || "Token refresh failed",
        },
        401
      );
    }
  };
}
