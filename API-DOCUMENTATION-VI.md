# 📋 TÀI LIỆU API - HỆ THỐNG TCG BACKEND

## 🚀 Tổng quan
Hệ thống API backend cho ứng dụng Trading Card Game (TCG) được xây dựng với Hono.js, MongoDB và TypeScript. API cung cấp đầy đủ các chức năng quản lý thẻ bài, người dùng, bộ sưu tập và bộ bài.

**Base URL:** `http://localhost:3000`

---

## 🔐 **1. XÁC THỰC (AUTHENTICATION)**

### 📝 Đăng ký tài khoản
```
POST /auth/register
```

**Mô tả:** Tạo tài khoản người dùng mới

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "Nguyễn",
  "lastName": "Văn A", 
  "dateOfBirth": "1990-01-15"
}
```

**Validation Rules:**
- `email`: Địa chỉ email hợp lệ (bắt buộc)
- `password`: Tối thiểu 8 ký tự, có chữ hoa, chữ thường và số (bắt buộc)
- `firstName`: Tên không được để trống (bắt buộc)
- `lastName`: Họ không được để trống (bắt buộc)
- `dateOfBirth`: Định dạng YYYY-MM-DD (bắt buộc)

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "Nguyễn",
      "lastName": "Văn A",
      "isEmailVerified": false,
      "createdAt": "2025-09-29T10:00:00Z"
    }
  }
}
```

### 🔑 Đăng nhập
```
POST /auth/login
```

**Mô tả:** Xác thực người dùng và tạo token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "Nguyễn",
      "lastName": "Văn A"
    }
  }
}
```

### 🔄 Làm mới token
```
POST /auth/refresh-token
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 🔒 Quên mật khẩu
```
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### ✅ Xác minh email
```
GET /auth/verify-email?token=<verification_token>
```

### 🔐 Đặt lại mật khẩu
```
POST /auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "NewPassword123!"
}
```

---

## 🃏 **2. QUẢN LÝ THẺ BÀI (CARDS)**

### 📋 Lấy danh sách thẻ Pokemon
```
GET /cards/pokemon
```

**Query Parameters:**
- `page` (number): Số trang (mặc định: 1)
- `limit` (number): Số thẻ mỗi trang (mặc định: 20, tối đa: 100)
- `sortBy` (string): Sắp xếp theo trường (name, rarity, number)
- `sortOrder` (string): Thứ tự sắp xếp (asc, desc)
- `search` (string): Tìm kiếm theo tên
- `rarity` (string): Lọc theo độ hiếm
- `type` (string): Lọc theo loại thẻ
- `set` (string): Lọc theo bộ thẻ

**Ví dụ:**
```
GET /cards/pokemon?page=1&limit=10&sortBy=name&sortOrder=asc&rarity=Common&type=Fire
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "card_id",
      "name": "Pikachu",
      "supertype": "Pokémon",
      "subtypes": ["Basic"],
      "hp": "60",
      "types": ["Electric"],
      "attacks": [...],
      "weaknesses": [...],
      "resistances": [...],
      "rarity": "Common",
      "set": {
        "name": "Base Set",
        "series": "Base"
      },
      "images": {
        "small": "https://...",
        "large": "https://..."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 🎯 Lấy thẻ Pokemon theo ID
```
GET /cards/pokemon/:id
```

**Response:** Trả về thông tin chi tiết một thẻ bài

### 🔍 Tìm kiếm thẻ Pokemon
```
GET /cards/pokemon/search
```

**Query Parameters:**
- `q` (string): Từ khóa tìm kiếm (bắt buộc)
- `page`, `limit`: Phân trang

**Ví dụ:**
```
GET /cards/pokemon/search?q=Pikachu&page=1&limit=5
```

### 🎴 Lấy danh sách thẻ Yugioh
```
GET /cards/yugioh
```

**Query Parameters:** Tương tự như thẻ Pokemon

### 🎯 Lấy thẻ Yugioh theo ID
```
GET /cards/yugioh/:id
```

### 🔍 Tìm kiếm thẻ Yugioh
```
GET /cards/yugioh/search
```

---

## 📚 **3. QUẢN LÝ BỘ SƯU TẬP (COLLECTIONS)**

> **Lưu ý:** Tất cả các endpoint này yêu cầu xác thực (Bearer Token)

### 📋 Lấy bộ sưu tập của người dùng
```
GET /collections
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page`, `limit`: Phân trang
- `cardType`: Lọc theo loại thẻ (pokemon, yugioh)

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "collection_item_id",
      "cardId": "card_id",
      "card": {
        "name": "Pikachu",
        "images": {...},
        "rarity": "Common"
      },
      "quantity": 3,
      "condition": "Near Mint",
      "dateAdded": "2025-09-29T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

### ➕ Thêm thẻ vào bộ sưu tập
```
POST /collections
```

**Request Body:**
```json
{
  "cardId": "card_object_id",
  "quantity": 2,
  "condition": "Near Mint"
}
```

**Điều kiện (Condition) có thể:**
- "Mint"
- "Near Mint" 
- "Lightly Played"
- "Moderately Played"
- "Heavily Played"
- "Damaged"

### ✏️ Cập nhật thẻ trong bộ sưu tập
```
PUT /collections/:itemId
```

**Request Body:**
```json
{
  "quantity": 5,
  "condition": "Lightly Played"
}
```

### 🗑️ Xóa thẻ khỏi bộ sưu tập
```
DELETE /collections/:itemId
```

---

## 🎴 **4. QUẢN LÝ BỘ BÀI (DECKS)**

> **Lưu ý:** Tất cả các endpoint này yêu cầu xác thực (Bearer Token)

### 📋 Lấy danh sách bộ bài của người dùng
```
GET /decks
```

**Query Parameters:**
- `page`, `limit`: Phân trang
- `gameType`: Lọc theo loại game (pokemon, yugioh)

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "deck_id",
      "name": "Bộ bài Electric",
      "description": "Bộ bài tập trung vào Pokemon điện",
      "gameType": "pokemon",
      "isPublic": false,
      "cardCount": 45,
      "createdAt": "2025-09-29T10:00:00Z"
    }
  ]
}
```

### ➕ Tạo bộ bài mới
```
POST /decks
```

**Request Body:**
```json
{
  "name": "Bộ bài Electric",
  "description": "Bộ bài tập trung vào Pokemon điện",
  "gameType": "pokemon",
  "isPublic": false
}
```

### 🎯 Lấy thông tin chi tiết bộ bài
```
GET /decks/:deckId
```

### ✏️ Cập nhật thông tin bộ bài
```
PUT /decks/:deckId
```

**Request Body:**
```json
{
  "name": "Tên mới",
  "description": "Mô tả mới",
  "isPublic": true
}
```

### 🗑️ Xóa bộ bài
```
DELETE /decks/:deckId
```

### 📋 Lấy danh sách thẻ trong bộ bài
```
GET /decks/:deckId/cards
```

### ➕ Thêm thẻ vào bộ bài
```
POST /decks/:deckId/cards
```

**Request Body:**
```json
{
  "cardId": "card_object_id",
  "quantity": 3
}
```

### ✏️ Cập nhật số lượng thẻ trong bộ bài
```
PUT /decks/:deckId/cards/:cardId
```

**Request Body:**
```json
{
  "quantity": 2
}
```

### 🗑️ Xóa thẻ khỏi bộ bài
```
DELETE /decks/:deckId/cards/:cardId
```

---

## 👤 **5. QUẢN LÝ NGƯỜI DÙNG (USERS)**

> **Lưu ý:** Tất cả các endpoint này yêu cầu xác thực (Bearer Token)

### 👤 Lấy thông tin hồ sơ
```
GET /users/profile
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "Nguyễn",
    "lastName": "Văn A",
    "dateOfBirth": "1990-01-15",
    "avatarUrl": "https://...",
    "isEmailVerified": true,
    "createdAt": "2025-09-29T10:00:00Z"
  }
}
```

### ✏️ Cập nhật thông tin hồ sơ
```
PUT /users/profile
```

**Request Body:**
```json
{
  "firstName": "Tên mới",
  "lastName": "Họ mới",
  "avatarUrl": "https://new-avatar-url.com",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

### 🔐 Đổi mật khẩu
```
PUT /users/change-password
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

### 📊 Lấy thống kê người dùng
```
GET /users/stats
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "totalCards": 150,
    "totalDecks": 5,
    "favoriteCardType": "Pokemon",
    "collectionValue": 1250000,
    "joinDate": "2025-01-15T00:00:00Z"
  }
}
```

---

## 📊 **6. MÃ LỖI VÀ XỬ LÝ**

### Cấu trúc Response lỗi chung:
```json
{
  "success": false,
  "error": {
    "name": "ValidationError",
    "field": "email", 
    "message": "Địa chỉ email không hợp lệ"
  }
}
```

### Các mã lỗi HTTP:

| Mã lỗi | Ý nghĩa | Mô tả |
|---------|---------|--------|
| 200 | OK | Yêu cầu thành công |
| 201 | Created | Tạo mới thành công |
| 400 | Bad Request | Dữ liệu đầu vào không hợp lệ |
| 401 | Unauthorized | Chưa xác thực hoặc token không hợp lệ |
| 403 | Forbidden | Không có quyền truy cập |
| 404 | Not Found | Không tìm thấy tài nguyên |
| 409 | Conflict | Dữ liệu đã tồn tại |
| 422 | Unprocessable Entity | Dữ liệu không xử lý được |
| 500 | Internal Server Error | Lỗi máy chủ nội bộ |

### Các loại lỗi thường gặp:

#### ValidationError
```json
{
  "success": false,
  "error": {
    "name": "ValidationError",
    "field": "password",
    "message": "Mật khẩu phải có ít nhất 8 ký tự"
  }
}
```

#### AuthenticationError
```json
{
  "success": false,
  "error": {
    "name": "AuthenticationError", 
    "message": "Token không hợp lệ hoặc đã hết hạn"
  }
}
```

#### NotFoundError
```json
{
  "success": false,
  "error": {
    "name": "NotFoundError",
    "message": "Không tìm thấy thẻ bài"
  }
}
```

---

## 🔒 **7. XÁC THỰC VÀ PHÂN QUYỀN**

### Bearer Token Authentication
Hầu hết các endpoint cần header xác thực:
```
Authorization: Bearer <access_token>
```

### Quy trình xác thực:
1. **Đăng ký/Đăng nhập** → Nhận `accessToken` và `refreshToken`
2. **Sử dụng accessToken** trong header cho các API calls
3. **Khi token hết hạn** → Dùng `refreshToken` để lấy token mới
4. **Khi refreshToken hết hạn** → Yêu cầu đăng nhập lại

### Thời gian hết hạn:
- **Access Token:** 15 phút
- **Refresh Token:** 7 ngày
- **Email Verification Token:** 24 giờ
- **Password Reset Token:** 1 giờ

---

## 🚀 **8. HƯỚNG DẪN SỬ DỤNG**

### Ví dụ quy trình hoàn chỉnh:

#### 1. Đăng ký tài khoản
```javascript
const response = await fetch('http://localhost:3000/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123!',
    firstName: 'Nguyễn',
    lastName: 'Văn A',
    dateOfBirth: '1990-01-15'
  })
});
```

#### 2. Đăng nhập và lấy token
```javascript
const loginResponse = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123!'
  })
});

const { data } = await loginResponse.json();
const accessToken = data.accessToken;
```

#### 3. Sử dụng API với token
```javascript
const cardsResponse = await fetch('http://localhost:3000/cards/pokemon?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

#### 4. Thêm thẻ vào bộ sưu tập
```javascript
const addToCollection = await fetch('http://localhost:3000/collections', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cardId: 'card_id_from_previous_call',
    quantity: 2,
    condition: 'Near Mint'
  })
});
```

---

## 🔧 **9. CẤU HÌNH VÀ MÔTKƯỜNG**

### Biến môi trường (.env):
```env
# Database
MONGODB_URI=mongodb://localhost:27017/tcg_db

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=15m
REFRESH_JWT_SECRET=your-refresh-secret
REFRESH_JWT_EXPIRES_IN=7d

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@tcg-app.com

# App
APP_URL=http://localhost:3000
NODE_ENV=development
PORT=3000
```

### Khởi chạy server:
```bash
# Development
npm run dev

# Production 
npm start

# Testing
npm test
```

---

## 📈 **10. HIỆU SUẤT VÀ GIỚI HẠN**

### Rate Limiting:
- **Authentication endpoints:** 5 requests/phút
- **API endpoints:** 100 requests/phút
- **Search endpoints:** 30 requests/phút

### Pagination limits:
- **Tối đa 100 items/page** cho tất cả danh sách
- **Mặc định 20 items/page**

### File upload limits:
- **Avatar images:** Tối đa 2MB
- **Supported formats:** JPG, PNG, WEBP

---

## 🐛 **11. DEBUGGING VÀ LOGGING**

### Log levels:
- `ERROR`: Lỗi hệ thống nghiêm trọng
- `WARN`: Cảnh báo, vấn đề không nghiêm trọng  
- `INFO`: Thông tin hoạt động bình thường
- `DEBUG`: Chi tiết để debug (chỉ trong development)

### Health check:
```
GET /health
```
Trả về trạng thái hệ thống và kết nối database.

---

## 📞 **12. LIÊN HỆ VÀ HỖ TRỢ**

- **GitHub Repository:** [tcg_be](https://github.com/PTan2505/tcg_be)
- **Issues:** Báo cáo lỗi tại GitHub Issues
- **Documentation:** Cập nhật tại `/docs` folder

---

*Tài liệu này được cập nhật lần cuối: September 29, 2025*
*Version: 1.0.0*