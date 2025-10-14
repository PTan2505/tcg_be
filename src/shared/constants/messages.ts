/**
 * Tập hợp tất cả các message response tiếng Việt cho backend
 * Được sử dụng để đảm bảo tính nhất quán và dễ dàng quản lý
 */

export const MESSAGES = {
  // Authentication Messages
  AUTH: {
    REGISTER_SUCCESS: "Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP xác thực tài khoản.",
    REGISTER_FAILED: "Đăng ký thất bại",
    LOGIN_SUCCESS: "Đăng nhập thành công",
    LOGIN_FAILED: "Đăng nhập thất bại",
    EMAIL_VERIFICATION_SUCCESS: "Xác thực email thành công",
    EMAIL_VERIFICATION_FAILED: "Xác thực email thất bại",
    OTP_RESENT: "Mã OTP mới đã được gửi đến email của bạn",
    OTP_RESEND_FAILED: "Không thể gửi lại mã OTP",
    FORGOT_PASSWORD_SUCCESS: "Nếu email tồn tại, mã OTP đã được gửi đến hộp thư của bạn",
    FORGOT_PASSWORD_FAILED: "Không thể xử lý yêu cầu",
    RESET_PASSWORD_SUCCESS: "Đặt lại mật khẩu thành công",
    RESET_PASSWORD_FAILED: "Đặt lại mật khẩu thất bại",
    TOKEN_REFRESH_FAILED: "Làm mới token thất bại",
    NO_TOKEN_PROVIDED: "Không có token được cung cấp",
    USER_NOT_FOUND: "Người dùng không tồn tại",
    INVALID_TOKEN: "Token không hợp lệ hoặc đã hết hạn",
    AUTHENTICATION_FAILED: "Xác thực thất bại",
    AUTHENTICATION_REQUIRED: "Yêu cầu xác thực",
    ACCESS_DENIED: "Truy cập bị từ chối"
  },

  // Validation Messages
  VALIDATION: {
    PAGE_GREATER_THAN_ZERO: "Trang phải lớn hơn 0",
    LIMIT_BETWEEN_1_100: "Giới hạn phải từ 1 đến 100",
    GAME_TYPE_INVALID: "Có card không cùng thể loại của deck này",
    SEARCH_QUERY_REQUIRED: "Từ khóa tìm kiếm là bắt buộc",
    SEARCH_QUERY_EMPTY: "Từ khóa tìm kiếm không được để trống",
    SET_ID_REQUIRED: "ID set là bắt buộc",
    CARD_ID_REQUIRED: "ID card là bắt buộc",
  DUPLICATE_CARD_IN_PAYLOAD: "Payload chứa card trùng lặp (cùng cardId)",
    PRODUCT_ID_REQUIRED: "ID sản phẩm hợp lệ là bắt buộc",
    GROUP_ID_REQUIRED: "ID nhóm hợp lệ là bắt buộc",
    INVALID_REQUEST_PARAMETERS: "Tham số yêu cầu không hợp lệ",
    REQUIRED_FIELD: (field: string) => `${field} là bắt buộc`,
  CANNOT_BLOCK_SELF: "Không thể chặn chính bạn",
  CARD_NOT_FOUND_IN_DECK: "Không tìm thấy thẻ trong deck",
  INVALID_OBJECT_ID: "ID không hợp lệ",
  CANNOT_CONVERT_TO_OBJECT_ID: "Không thể chuyển sang ObjectId",
    
    // Zod validation messages in Vietnamese
    ZOD_MESSAGES: {
      "Required": "Trường này là bắt buộc",
      "String must contain at least": "Phải chứa ít nhất",
      "String must contain at most": "Không được vượt quá",
      "Invalid email": "Email không hợp lệ",
      "Invalid email format": "Định dạng email không hợp lệ", 
      "Password must contain at least one uppercase letter, one lowercase letter, and one number": "Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một số",
      "Password must be at least": "Mật khẩu phải có ít nhất",
      "Password must be at most": "Mật khẩu không được vượt quá",
      "Expected string, received": "Mong đợi chuỗi, nhận được",
      "Expected number, received": "Mong đợi số, nhận được",
      "Expected boolean, received": "Mong đợi boolean, nhận được",
      "Expected array, received": "Mong đợi mảng, nhận được",
      "Expected object, received": "Mong đợi object, nhận được",
      "Invalid": "Không hợp lệ",
      "Too small": "Quá nhỏ",
      "Too big": "Quá lớn",
      "Number must be greater than": "Số phải lớn hơn",
      "Number must be less than": "Số phải nhỏ hơn",
      "Number must be greater than or equal to": "Số phải lớn hơn hoặc bằng",
      "Number must be less than or equal to": "Số phải nhỏ hơn hoặc bằng",
      "Array must contain at least": "Mảng phải chứa ít nhất",
      "Array must contain at most": "Mảng không được vượt quá",
      "Invalid input": "Dữ liệu đầu vào không hợp lệ",
      "Invalid date": "Ngày không hợp lệ",
      "Invalid enum value": "Giá trị enum không hợp lệ",
      "Expected": "Mong đợi",
      "received": "nhận được"
    }
  },

  // Card Messages
  CARDS: {
    FETCH_SUCCESS: "Lấy danh sách thẻ thành công",
    FETCH_FAILED: "Không thể lấy danh sách thẻ",
    CARD_NOT_FOUND: "Không tìm thấy thẻ",
    SEARCH_SUCCESS: "Tìm kiếm thẻ thành công",
    SEARCH_FAILED: "Tìm kiếm thẻ thất bại",
    STATS_SUCCESS: "Lấy thống kê thẻ thành công",
    STATS_FAILED: "Không thể lấy thống kê thẻ",
    CARDS_BY_SET_SUCCESS: "Lấy thẻ theo set thành công",
    CARDS_BY_SET_FAILED: "Không thể lấy thẻ theo set"
    ,
    RECOGNITION_FAILED: "Không thể nhận diện thẻ",
    UNSUPPORTED_GAME_TYPE: "Loại game không được hỗ trợ"
  },

  // OCR specific messages
  OCR: {
    INIT_FAILED: "Khởi tạo dịch vụ OCR thất bại",
    NO_SERVICE: "Không có dịch vụ OCR khả dụng",
    EXTRACT_TEXT_FAILED: "Không thể trích xuất văn bản từ ảnh",
    TESSERACT_NOT_INITIALIZED: "Tesseract chưa được khởi tạo. Vui lòng chờ",
    TESSERACT_FAILED: "Tesseract OCR thất bại"
  },

  // Visual matching / similarity messages
  VISUAL: {
    FAILED_EXTRACT_FEATURES: "Không thể trích xuất đặc trưng ảnh",
    FAILED_DOWNLOAD: "Không thể tải ảnh từ URL"
  },

  // AI memory messages
  AI: {
    MEMORY_NOT_INITIALIZED: "Bộ nhớ AI chưa được khởi tạo"
  },

  // Set Messages
  SETS: {
    FETCH_SUCCESS: "Lấy danh sách set thành công",
    FETCH_FAILED: "Không thể lấy danh sách set",
    SET_NOT_FOUND: "Không tìm thấy set",
    SEARCH_SUCCESS: "Tìm kiếm set thành công",
    SEARCH_FAILED: "Tìm kiếm set thất bại",
    STATS_SUCCESS: "Lấy thống kê set thành công",
    STATS_FAILED: "Không thể lấy thống kê set"
  },

  // Collection Messages
  COLLECTIONS: {
    GET_SUCCESS: "Lấy bộ sưu tập thành công",
    GET_FAILED: "Không thể lấy bộ sưu tập",
    ADD_CARD_SUCCESS: "Thêm thẻ vào bộ sưu tập thành công",
    ADD_CARD_FAILED: "Không thể thêm thẻ vào bộ sưu tập",
    REMOVE_CARD_SUCCESS: "Xóa thẻ khỏi bộ sưu tập thành công",
    REMOVE_CARD_FAILED: "Không thể xóa thẻ khỏi bộ sưu tập",
    UPDATE_CARD_SUCCESS: "Cập nhật thẻ trong bộ sưu tập thành công",
    UPDATE_CARD_FAILED: "Không thể cập nhật thẻ trong bộ sưu tập",
    CARD_ALREADY_EXISTS: "Thẻ đã tồn tại trong bộ sưu tập",
    CARD_NOT_FOUND_IN_COLLECTION: "Không tìm thấy thẻ trong bộ sưu tập"
  },

  // Deck Messages
  DECKS: {
    GET_SUCCESS: "Lấy danh sách deck thành công",
    GET_FAILED: "Không thể lấy danh sách deck",
    CREATE_SUCCESS: "Tạo deck thành công",
    CREATE_FAILED: "Không thể tạo deck",
    UPDATE_SUCCESS: "Cập nhật deck thành công",
    UPDATE_FAILED: "Không thể cập nhật deck",
    DELETE_SUCCESS: "Xóa deck thành công",
    DELETE_FAILED: "Không thể xóa deck",
    DECK_NOT_FOUND: "Không tìm thấy deck",
    DECK_NOT_FOUND_OR_ACCESS_DENIED: "Không tìm thấy deck hoặc không có quyền truy cập"
  },

  // Premium / Freemium Messages
  PREMIUM: {
    DECK_LIMIT_REACHED: "Giới hạn deck cho tài khoản freemium đã đạt (tối đa 3). Vui lòng nâng cấp lên Premium để tạo thêm.",
    SCAN_LIMIT_REACHED: "Giới hạn quét thẻ cho tài khoản freemium đã đạt (tối đa 10). Vui lòng nâng cấp lên Premium để quét thêm.",
    COLLECTION_LIMIT_REACHED: "Giới hạn bộ sưu tập cho tài khoản freemium đã đạt (tối đa 30 cho mỗi game). Vui lòng nâng cấp lên Premium để thêm thẻ.",
    SOCIAL_DISABLED: "Tính năng mạng xã hội bị vô hiệu cho tài khoản freemium. Vui lòng nâng cấp lên Premium để sử dụng.",
    MARKET_DISABLED: "Tính năng thị trường bị vô hiệu cho tài khoản freemium. Vui lòng nâng cấp lên Premium để sử dụng.",
  },

  // Market-specific error messages
  MARKET: {
    LISTING_NOT_FOUND: "Không tìm thấy tin rao hoặc không có quyền truy cập",
    LISTING_NOT_AVAILABLE: "Tin rao không khả dụng",
    INSUFFICIENT_TOKENS: "Số dư token không đủ",
    TRANSACTION_NOT_SHIPPED: "Giao dịch chưa được gửi (chưa shipped)",
    SELLER_NOT_FOUND: "Người bán không tồn tại"
  },

  // User Messages
  USERS: {
    PROFILE_SUCCESS: "Lấy thông tin hồ sơ thành công",
    PROFILE_FAILED: "Không thể lấy thông tin hồ sơ",
    UPDATE_PROFILE_SUCCESS: "Cập nhật hồ sơ thành công",
    UPDATE_PROFILE_FAILED: "Không thể cập nhật hồ sơ",
    DELETE_SUCCESS: "Xóa người dùng thành công",
    DELETE_FAILED: "Không thể xóa người dùng",
    CHANGE_PASSWORD_SUCCESS: "Đổi mật khẩu thành công",
    CHANGE_PASSWORD_FAILED: "Không thể đổi mật khẩu",
    CHANGE_AVATAR_SUCCESS: "Đổi ảnh đại diện thành công",
    CHANGE_AVATAR_FAILED: "Không thể đổi ảnh đại diện",
    PASSWORD_MISMATCH: "Mật khẩu xác nhận không khớp",
    CURRENT_PASSWORD_INCORRECT: "Mật khẩu hiện tại không đúng"
  },
  // Authentication extras
  AUTH_EXTRAS: {
    EMAIL_ALREADY_EXISTS: "Email đã được sử dụng",
    USERNAME_ALREADY_EXISTS: "Tên đăng nhập đã được sử dụng",
    INVALID_CREDENTIALS: "Thông tin xác thực không hợp lệ"
  },

  // Comment Messages
  COMMENTS: {
    CREATE_SUCCESS: "Tạo bình luận thành công",
    CREATE_FAILED: "Không thể tạo bình luận",
    UPDATE_SUCCESS: "Cập nhật bình luận thành công",
    UPDATE_FAILED: "Không thể cập nhật bình luận",
    DELETE_SUCCESS: "Xóa bình luận thành công",
    DELETE_FAILED: "Không thể xóa bình luận",
    GET_SUCCESS: "Lấy danh sách bình luận thành công",
    GET_FAILED: "Không thể lấy danh sách bình luận",
    COMMENT_NOT_FOUND: "Không tìm thấy bình luận",
    COMMENT_NOT_FOUND_OR_ACCESS_DENIED: "Không tìm thấy bình luận hoặc không có quyền truy cập",
    GET_REPLIES_SUCCESS: "Lấy phản hồi thành công",
    GET_REPLIES_FAILED: "Không thể lấy phản hồi"
  },

  // Post Messages
  POSTS: {
    CREATE_SUCCESS: "Tạo bài viết thành công",
    CREATE_FAILED: "Không thể tạo bài viết",
    UPDATE_SUCCESS: "Cập nhật bài viết thành công",
    UPDATE_FAILED: "Không thể cập nhật bài viết",
    DELETE_SUCCESS: "Xóa bài viết thành công",
    DELETE_FAILED: "Không thể xóa bài viết",
    GET_SUCCESS: "Lấy danh sách bài viết thành công",
    GET_FAILED: "Không thể lấy danh sách bài viết",
    POST_NOT_FOUND: "Không tìm thấy bài viết",
    POST_NOT_FOUND_OR_ACCESS_DENIED: "Không tìm thấy bài viết hoặc không có quyền truy cập"
  },

  // Rate Limiting Messages
  RATE_LIMIT: {
    TOO_MANY_REQUESTS: "Quá nhiều yêu cầu. Vui lòng thử lại sau."
  },

  // General Error Messages
  ERRORS: {
    GENERAL_ERROR: "Đã xảy ra lỗi",
    UNKNOWN_ERROR: "Lỗi không xác định",
    INTERNAL_SERVER_ERROR: "Lỗi máy chủ nội bộ",
    NOT_FOUND: "Không tìm thấy",
    BAD_REQUEST: "Yêu cầu không hợp lệ",
    FORBIDDEN: "Bị cấm",
    UNAUTHORIZED: "Không được phép"
  }
};

/**
 * Helper function để dịch Zod validation messages sang tiếng Việt
 */
export const translateZodMessage = (originalMessage: string): string => {
  const zodMessages = MESSAGES.VALIDATION.ZOD_MESSAGES;
  
  // Exact match first
  if (zodMessages[originalMessage as keyof typeof zodMessages]) {
    return zodMessages[originalMessage as keyof typeof zodMessages];
  }
  
  // Pattern matching for common cases
  for (const [englishPattern, vietnameseTranslation] of Object.entries(zodMessages)) {
    if (originalMessage.includes(englishPattern)) {
      // Handle special cases with dynamic values
      if (englishPattern.includes("at least") && originalMessage.match(/\d+/)) {
        const number = originalMessage.match(/\d+/)?.[0];
        if (originalMessage.includes("String must contain at least")) {
          return `Phải chứa ít nhất ${number} ký tự`;
        }
        if (originalMessage.includes("Password must be at least")) {
          return `Mật khẩu phải có ít nhất ${number} ký tự`;
        }
        if (originalMessage.includes("Array must contain at least")) {
          return `Mảng phải chứa ít nhất ${number} phần tử`;
        }
        if (originalMessage.includes("Number must be greater than")) {
          return `Số phải lớn hơn ${number}`;
        }
      }
      
      if (englishPattern.includes("at most") && originalMessage.match(/\d+/)) {
        const number = originalMessage.match(/\d+/)?.[0];
        if (originalMessage.includes("String must contain at most")) {
          return `Không được vượt quá ${number} ký tự`;
        }
        if (originalMessage.includes("Password must be at most")) {
          return `Mật khẩu không được vượt quá ${number} ký tự`;
        }
        if (originalMessage.includes("Array must contain at most")) {
          return `Mảng không được vượt quá ${number} phần tử`;
        }
      }
      
      // Type mismatch messages
      if (originalMessage.includes("Expected") && originalMessage.includes("received")) {
        const match = originalMessage.match(/Expected (\w+), received (\w+)/);
        if (match) {
          const expected = match[1];
          const received = match[2];
          const typeTranslations: Record<string, string> = {
            'string': 'chuỗi',
            'number': 'số',
            'boolean': 'boolean',
            'array': 'mảng',
            'object': 'object',
            'undefined': 'undefined',
            'null': 'null'
          };
          return `Mong đợi ${typeTranslations[expected] || expected}, nhận được ${typeTranslations[received] || received}`;
        }
      }
      
      return vietnameseTranslation;
    }
  }
  
  // Fallback to original message if no translation found
  return originalMessage;
};

/**
 * Helper function để lấy message dựa trên key path
 * Ví dụ: getMessage('AUTH.LOGIN_SUCCESS')
 */
export const getMessage = (keyPath: string): string => {
  const keys = keyPath.split('.');
  let value: any = MESSAGES;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return 'Message not found';
    }
  }
  
  return typeof value === 'string' ? value : 'Invalid message key';
};

/**
 * Helper function để tạo response object với message tiếng Việt
 */
export const createSuccessResponse = (data?: any, message?: string, pagination?: any) => {
  const response: any = {
    success: true,
    data
  };
  
  if (message) {
    response.message = message;
  }
  
  if (pagination) {
    response.pagination = pagination;
  }
  
  return response;
};

export const createErrorResponse = (error: string | { name: string; field: string; message: string }, statusCode?: number) => {
  return {
    success: false,
    error: typeof error === 'string' ? { message: error } : error
  };
};