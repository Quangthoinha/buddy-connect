# API Specification: Buddy Connect

## 1. `POST /api/match`
- **Mục đích**: Gợi ý danh sách buddy có độ tương thích cao.
- **Request Body**: `{ "userId": "string", "workspaceId": "string" }`
- **Response**: Mảng các đối tượng chứa thông tin user và `score` (điểm tương thích), `match_reasons` (lý do match).
- **Logic**: Đánh giá dựa trên 6 dimensions: tags, parent group, facility, skills, goals.

## 2. `POST /api/icebreaker`
- **Mục đích**: Sinh tin nhắn mở lời (Icebreaker) dựa trên thông tin 2 user.
- **Request Body**: `{ "fromUser": { ... }, "toUser": { ... } }`
- **Response**: `{ "message": "string" }`
- **Bảo mật**: Anti-injection XML tag, force JSON.
- **Fallback**: Trả về rule-based string nếu AI lỗi.
- **Rate Limit**: Áp dụng quota (Migration 005).
