#!/usr/bin/env node
import './_node-shim.js';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'mushy.config.json');
if (!existsSync(configPath)) {
  console.error('❌ Thiếu mushy.config.json ở root repo.');
  process.exit(1);
}
const config = JSON.parse(readFileSync(configPath, 'utf8'));

const URL = config.supabase?.url;
const ANON = config.supabase?.anonKey;
const SLUG = config.slug;
const TOKEN = process.env.VITE_DEV_TOKEN;
const WS = process.env.VITE_DEV_WORKSPACE_ID;
const UID = process.env.VITE_DEV_USER_ID;
const ENV = process.env.VITE_APP_ENV || 'dev';
const SCHEMA = ENV === 'dev' ? `app_${SLUG.replace(/-/g, '_')}_dev` : `app_${SLUG.replace(/-/g, '_')}`;

if (!URL || !ANON || !TOKEN || !WS || !UID) {
  console.error('Thiếu config / env. Đảm bảo mushy.config.json có URL+anon+slug và đã chạy `npm run dev:setup`.');
  process.exit(1);
}

console.log(`Seeding CONNECT data vào schema ${SCHEMA}...`);

const sb = createClient(URL, ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${TOKEN}` } },
  db: { schema: SCHEMA },
});

const TAXONOMY = [
  {
    parent_code: 'sport', parent_name: 'Thể thao 🏸',
    children: [
      { code: 'badminton', name: 'Cầu lông 🏸' },
      { code: 'football', name: 'Bóng đá ⚽' },
      { code: 'running', name: 'Chạy bộ 🏃' },
      { code: 'gym', name: 'Tập Gym 🏋️' },
      { code: 'tennis', name: 'Tennis 🎾' },
      { code: 'basketball', name: 'Bóng rổ 🏀' },
      { code: 'swimming', name: 'Bơi lội 🏊' },
      { code: 'cycling', name: 'Đạp xe 🚴' },
      { code: 'tabletennis', name: 'Bóng bàn 🏓' },
      { code: 'yoga', name: 'Tập Yoga 🧘' },
      { code: 'climbing', name: 'Leo núi 🧗' },
      { code: 'billiards', name: 'Bi-a 🎱' },
      { code: 'chess', name: 'Cờ vua ♟️' },
      { code: 'xiangqi', name: 'Cờ tướng ☖' },
      { code: 'archery', name: 'Bắn cung 🏹' },
      { code: 'golf', name: 'Chơi Golf 🏌️' },
      { code: 'kayaking', name: 'Chèo thuyền 🛶' },
      { code: 'skateboarding', name: 'Trượt ván 🛹' },
      { code: 'bowling', name: 'Bowling 🎳' },
      { code: 'martialarts', name: 'Võ thuật 🥋' }
    ]
  },
  {
    parent_code: 'entertainment', parent_name: 'Giải trí 🎮',
    children: [
      { code: 'gaming', name: 'Chơi Game 🎮' },
      { code: 'boardgame', name: 'Board game 🎲' },
      { code: 'movie', name: 'Xem phim 🎬' },
      { code: 'music', name: 'Nghe nhạc 🎵' },
      { code: 'painting', name: 'Vẽ tranh 🎨' },
      { code: 'photography', name: 'Chụp ảnh 📸' },
      { code: 'reading', name: 'Đọc sách 📚' },
      { code: 'podcast', name: 'Nghe Podcast 🎧' },
      { code: 'theater', name: 'Xem kịch 🎭' },
      { code: 'karaoke', name: 'Hát Karaoke 🎤' },
      { code: 'pubbar', name: 'Đi Bar/Pub 🍷' },
      { code: 'comedy', name: 'Hài độc thoại 🎤' },
      { code: 'collecting', name: 'Sưu tầm 🪙' },
      { code: 'tarot', name: 'Bói Tarot 🃏' },
      { code: 'petcare', name: 'Thú cưng 🐶' },
      { code: 'gardening', name: 'Làm vườn 🪴' },
      { code: 'origami', name: 'Xếp giấy Origami 📄' },
      { code: 'lego', name: 'Lắp Lego 🧱' },
      { code: 'walking', name: 'Đi dạo 🚶' },
      { code: 'blogging', name: 'Viết Blog 📝' }
    ]
  },
  {
    parent_code: 'gastronomy', parent_name: 'Ăn uống 🍲',
    children: [
      { code: 'cafe', name: 'Đi uống Cafe ☕' },
      { code: 'milktea', name: 'Uống Trà sữa 🧋' },
      { code: 'snacking', name: 'Ăn vặt 🍟' },
      { code: 'buffet', name: 'Ăn Buffet 🥩' },
      { code: 'hotpot', name: 'Ăn Lẩu 🍲' },
      { code: 'bbq', name: 'Ăn đồ nướng BBQ 🍖' },
      { code: 'pastries', name: 'Bánh ngọt 🍰' },
      { code: 'afternoontea', name: 'Trà chiều 🫖' },
      { code: 'foodhunting', name: 'Khám phá quán mới 🔍' },
      { code: 'homecooking', name: 'Nấu ăn tại nhà 🍳' },
      { code: 'baking', name: 'Làm bánh 🥖' },
      { code: 'vegan', name: 'Ăn đồ chay 🥗' },
      { code: 'wine', name: 'Thưởng rượu 🍷' },
      { code: 'koreanfood', name: 'Món ăn Hàn 🇰🇷' },
      { code: 'japanesefood', name: 'Món ăn Nhật 🇯🇵' },
      { code: 'thaifood', name: 'Món ăn Thái 🇹🇭' },
      { code: 'noodles', name: 'Phở & Bún bò 🍜' },
      { code: 'streetfood', name: 'Ẩm thực đường phố 🍢' },
      { code: 'seafood', name: 'Ăn Hải sản 🦞' },
      { code: 'healthyfood', name: 'Đồ ăn Healthy 🥗' }
    ]
  },
  {
    parent_code: 'learning', parent_name: 'Học tập & Kỹ năng 📖',
    children: [
      { code: 'language', name: 'Học ngoại ngữ 🗣️' },
      { code: 'presentation', name: 'Thuyết trình 📊' },
      { code: 'writing', name: 'Viết sáng tạo ✍️' },
      { code: 'communication', name: 'Kỹ năng giao tiếp 💬' },
      { code: 'criticalthinking', name: 'Tư duy phản biện 🧠' },
      { code: 'timemanagement', name: 'Quản lý thời gian ⏱️' },
      { code: 'finance', name: 'Đầu tư tài chính 📈' },
      { code: 'professionalreading', name: 'Sách chuyên môn 📘' },
      { code: 'leadership', name: 'Kỹ năng lãnh đạo 👑' },
      { code: 'slidedesign', name: 'Thiết kế Slide 🖼️' },
      { code: 'voice', name: 'Luyện giọng nói 🗣️' },
      { code: 'negotiation', name: 'Kỹ năng đàm phán 🤝' },
      { code: 'problemsolving', name: 'Giải quyết vấn đề 🧩' },
      { code: 'teamwork', name: 'Làm việc nhóm 👥' },
      { code: 'mindmap', name: 'Vẽ Mindmap 🗺️' },
      { code: 'instrument', name: 'Học chơi đàn 🎸' },
      { code: 'artclasses', name: 'Học vẽ mỹ thuật 🎨' },
      { code: 'flowerarranging', name: 'Cắm hoa 💐' },
      { code: 'phonephoto', name: 'Chụp ảnh điện thoại 📱' },
      { code: 'potteryclas', name: 'Làm gốm 🏺' }
    ]
  },
  {
    parent_code: 'technology', parent_name: 'Công nghệ & Sáng tạo 💻',
    children: [
      { code: 'ai', name: 'Trí tuệ nhân tạo AI 🤖' },
      { code: 'frontend', name: 'Lập trình Frontend 💻' },
      { code: 'backend', name: 'Lập trình Backend ⚙️' },
      { code: 'uiux', name: 'Thiết kế UI/UX 🎨' },
      { code: 'datascience', name: 'Khoa học dữ liệu 📊' },
      { code: 'productmanagement', name: 'Phát triển sản phẩm 🚀' },
      { code: 'blockchain', name: 'Blockchain ⛓️' },
      { code: 'security', name: 'An toàn thông tin 🛡️' },
      { code: 'cloud', name: 'Điện toán đám mây ☁️' },
      { code: 'graphicdesign', name: 'Thiết kế đồ họa 🎨' },
      { code: 'videoediting', name: 'Edit Video 🎬' },
      { code: 'content', name: 'Sáng tạo nội dung ✍️' },
      { code: 'nocode', name: 'No-code / Low-code 🛠️' },
      { code: 'automation', name: 'Tự động hóa 🤖' },
      { code: 'miniapp', name: 'Phát triển Mini-App 📱' },
      { code: 'seo', name: 'Tối ưu hóa SEO 📈' },
      { code: 'ba', name: 'Phân tích nghiệp vụ BA 📊' },
      { code: 'agilescrum', name: 'Agile & Scrum 🔄' },
      { code: 'iot', name: 'Internet of Things 🔌' },
      { code: 'illustration', name: 'Vẽ minh họa 🎨' }
    ]
  },
  {
    parent_code: 'health', parent_name: 'Sức khỏe & Tinh thần 🧘',
    children: [
      { code: 'meditation', name: 'Thiền định 🧘' },
      { code: 'mentalhealth', name: 'Trị liệu tinh thần 🧠' },
      { code: 'skincare', name: 'Chăm sóc da Skincare 🧴' },
      { code: 'keto', name: 'Chế độ ăn Keto 🥩' },
      { code: 'sleep', name: 'Rèn giấc ngủ ngon 😴' },
      { code: 'detox', name: 'Detox cơ thể 🥤' },
      { code: 'aerobic', name: 'Thể dục nhịp điệu 🤸' },
      { code: 'walking10k', name: 'Đi bộ 10k bước 🚶' },
      { code: 'pilates', name: 'Tập Pilates 🧘' },
      { code: 'spa', name: 'Massage & Spa 💆' },
      { code: 'counseling', name: 'Tư vấn tâm lý 💬' },
      { code: 'aromatherapy', name: 'Liệu pháp hương thơm 🪵' },
      { code: 'soundbath', name: 'Trị liệu chuông xoay 🔔' },
      { code: 'naturalhealing', name: 'Chữa lành tự nhiên 🌱' },
      { code: 'minimalismlife', name: 'Sống tối giản 🌿' },
      { code: 'focus', name: 'Rèn sự tập trung 🎯' },
      { code: 'gratitude', name: 'Viết sổ biết ơn 📓' },
      { code: 'earlyrise', name: 'Thử thách dậy sớm 🌅' },
      { code: 'fasting', name: 'Nhịn ăn gián đoạn ⏱️' },
      { code: 'laughteryoga', name: 'Yoga cười 😄' }
    ]
  },
  {
    parent_code: 'travel', parent_name: 'Du lịch & Khám phá ✈️',
    children: [
      { code: 'roadtrip', name: 'Phượt xe máy 🏍️' },
      { code: 'camping', name: 'Cắm trại Camping ⛺' },
      { code: 'checkin', name: 'Check-in địa danh 📸' },
      { code: 'resort', name: 'Du lịch nghỉ dưỡng 🏖️' },
      { code: 'museum', name: 'Khám phá bảo tàng 🏛️' },
      { code: 'trekking', name: 'Trekking leo rừng 🥾' },
      { code: 'spiritual', name: 'Du lịch tâm linh 🛕' },
      { code: 'backpacking', name: 'Du lịch bụi 🎒' },
      { code: 'beach', name: 'Đi du lịch biển 🏖️' },
      { code: 'summit', name: 'Chinh phục đỉnh núi 🏔️' },
      { code: 'cave', name: 'Khám phá hang động 🪨' },
      { code: 'architecture', name: 'Chụp ảnh kiến trúc cổ 📸' },
      { code: 'citynight', name: 'City tour buổi tối 🌃' },
      { code: 'homestay', name: 'Trải nghiệm Homestay 🏡' },
      { code: 'localfood', name: 'Ẩm thực vùng miền 🍲' },
      { code: 'solotravel', name: 'Du lịch một mình 🧭' },
      { code: 'hiddencafe', name: 'Khám phá quán ẩn ☕' },
      { code: 'nightmarket', name: 'Đi chợ đêm 🌌' },
      { code: 'sunset', name: 'Xem hoàng hôn 🌅' },
      { code: 'train', name: 'Đi du lịch tàu hỏa 🚂' }
    ]
  },
  {
    parent_code: 'arts', parent_name: 'Nghệ thuật & Sáng tác 🎨',
    children: [
      { code: 'poetry', name: 'Viết thơ ca 📝' },
      { code: 'guitar', name: 'Chơi Guitar 🎸' },
      { code: 'piano', name: 'Chơi Piano 🎹' },
      { code: 'oilpainting', name: 'Vẽ tranh sơn dầu 🎨' },
      { code: 'claywork', name: 'Nặn đất sét 🧱' },
      { code: 'handmade', name: 'Làm đồ handmade ✂️' },
      { code: 'acting', name: 'Kịch nghệ & Diễn xuất 🎭' },
      { code: 'shortstory', name: 'Viết truyện ngắn ✍️' },
      { code: 'flowerart', name: 'Cắm hoa nghệ thuật 💐' },
      { code: 'calligraphy', name: 'Thư pháp 🖌️' },
      { code: 'embroidery', name: 'Thêu thùa 🪡' },
      { code: 'watercolor', name: 'Vẽ màu nước 🎨' },
      { code: 'filmphoto', name: 'Chụp ảnh Film 🎞️' },
      { code: 'dance', name: 'Nhảy hiện đại 💃' },
      { code: 'songwriting', name: 'Sáng tác nhạc 🎵' },
      { code: 'vinyl', name: 'Sưu tầm đĩa than 📻' },
      { code: 'artexhibition', name: 'Xem triển lãm nghệ thuật 🖼️' },
      { code: 'candles', name: 'Làm nến thơm 🕯️' },
      { code: 'pottery', name: 'Làm gốm thủ công 🏺' },
      { code: 'fashiondesign', name: 'Thiết kế thời trang 👗' }
    ]
  },
  {
    parent_code: 'lifestyle', parent_name: 'Phong cách sống 🌿',
    children: [
      { code: 'minimalism', name: 'Sống tối giản 🌿' },
      { code: 'marikondo', name: 'Dọn nhà Mari Kondo 🧹' },
      { code: 'workspace', name: 'Setup góc làm việc 💻' },
      { code: 'secondhand', name: 'Thời trang secondhand 👗' },
      { code: 'vintage', name: 'Phong cách vintage 📻' },
      { code: 'sneakers', name: 'Sưu tầm Sneakers 👟' },
      { code: 'houseplants', name: 'Chăm sóc cây cảnh 🪴' },
      { code: 'zerowaste', name: 'Sống xanh không rác thải ♻️' },
      { code: 'fengshui', name: 'Phong thủy nhà ở 🏡' },
      { code: 'bookcafe', name: 'Văn hóa đọc Cafe ☕' },
      { code: 'cats', name: 'Nuôi mèo 🐱' },
      { code: 'dogs', name: 'Nuôi chó 🐶' },
      { code: 'personalfinance', name: 'Tài chính cá nhân 💰' },
      { code: 'perfume', name: 'Sưu tầm nước hoa 🧪' },
      { code: 'gadgets', name: 'Đồ chơi công nghệ 🔌' },
      { code: 'selfhelp', name: 'Đọc sách Self-help 📚' },
      { code: 'culture', name: 'Trải nghiệm văn hóa 🎭' },
      { code: 'weekendmarket', name: 'Hội chợ cuối tuần 🎪' },
      { code: 'sunsetwatching', name: 'Ngắm hoàng hôn 🌅' },
      { code: 'selfcare', name: 'Chăm sóc bản thân 🧴' }
    ]
  },
  {
    parent_code: 'networking', parent_name: 'Giao lưu & Kết nối 🤝',
    children: [
      { code: 'startup', name: 'Chia sẻ khởi nghiệp 🚀' },
      { code: 'careerguidance', name: 'Mentoring nghề nghiệp 🤝' },
      { code: 'cofounder', name: 'Tìm Co-founder 👥' },
      { code: 'jobhunting', name: 'Kinh nghiệm ứng tuyển 📄' },
      { code: 'businessbooks', name: 'Thảo luận sách kinh tế 📚' },
      { code: 'fundraising', name: 'Kỹ năng gọi vốn 💰' },
      { code: 'personalbranding', name: 'Thương hiệu cá nhân 👤' },
      { code: 'partnership', name: 'Tìm kiếm đối tác 🤝' },
      { code: 'seminar', name: 'Hội thảo chuyên ngành 🎤' },
      { code: 'englishclub', name: 'English Club 🗣️' },
      { code: 'crossdepartment', name: 'Cafe chéo phòng ban ☕' },
      { code: 'softskills', name: 'Chia sẻ kỹ năng mềm 💬' },
      { code: 'news', name: 'Thảo luận tin tức thế giới 📰' },
      { code: 'careerdev', name: 'Trao đổi cơ hội nghề nghiệp 💼' },
      { code: 'womenintech', name: 'Women in Tech 👩‍💻' },
      { code: 'toastmasters', name: 'CLB Toastmasters 🗣️' },
      { code: 'debating', name: 'Tranh biện kinh doanh 🧠' },
      { code: 'productivity', name: 'Tối ưu hiệu suất làm việc ⏱️' },
      { code: 'alumni', name: 'Gặp gỡ cựu sinh viên 🎓' },
      { code: 'lunchbuddy', name: 'Tìm đồng nghiệp ăn trưa 🍲' }
    ]
  }
];

// 1. Wipe existing tags in this workspace & Insert 200 tags
try {
  // Delete existing tags first to enable clean seed
  await sb.from('tags').delete().eq('workspace_id', WS);

  const tagsToInsert = [];
  TAXONOMY.forEach(p => {
    p.children.forEach(c => {
      tagsToInsert.push({
        workspace_id: WS,
        parent_code: p.parent_code,
        parent_name: p.parent_name,
        child_code: c.code,
        name: c.name
      });
    });
  });

  const { data: insertedTags, error: tagsErr } = await sb.from('tags').insert(tagsToInsert).select();
  if (tagsErr) throw tagsErr;
  console.log(`✓ Seeded thành công ${insertedTags.length} / 200 tags sở thích vào database!`);

  // 2. Fetch workspace members to create dummy profiles for testing
  const { data: memberProfiles, error: membersErr } = await sb.from('member_profiles').select('*').eq('workspace_id', WS);
  
  // Standard public workspace member lookup
  const dbPub = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${TOKEN}` } },
    db: { schema: 'public' },
  });
  
  const { data: wsMembers, error: wsMembersErr } = await dbPub.from('workspace_members').select('user_id, role').eq('workspace_id', WS);
  
  if (wsMembersErr) throw wsMembersErr;

  console.log(`Tìm thấy ${wsMembers.length} thành viên trong workspace này.`);

  // We want to seed profiles for other members to test the radar feature
  const departments = ['Kỹ thuật (R&D)', 'Kinh doanh (Sales)', 'Nhân sự (HR)', 'Marketing', 'Thiết kế (UI/UX)', 'Chăm sóc khách hàng (CS)'];
  const facilities = ['Cơ sở Hà Nội - Keangnam', 'Cơ sở TP.HCM - Landmark 81', 'Cơ sở Đà Nẵng - Hải Châu'];
  const times = ['Giờ ăn trưa', 'Chiều sau giờ làm', 'Cuối tuần', 'Tối ngày thường'];

  let profilesInserted = 0;
  let tagsLinked = 0;

  for (const member of wsMembers) {
    // Generate dummy details for everyone (including yourself if you don't have one)
    const isMe = member.user_id === UID;
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const fac = facilities[Math.floor(Math.random() * facilities.length)];
    const userTimes = [times[Math.floor(Math.random() * times.length)], times[Math.floor(Math.random() * times.length)]].filter((v, i, a) => a.indexOf(v) === i);

    // 1. Create or upsert profile
    const { error: profErr } = await sb.from('user_profiles').upsert({
      user_id: member.user_id,
      workspace_id: WS,
      department: dept,
      facility: fac,
      available_times: userTimes,
      updated_at: new Date().toISOString()
    });

    if (profErr) {
      console.warn(`Lỗi tạo hồ sơ cho user ${member.user_id}:`, profErr.message);
      continue;
    }
    profilesInserted++;

    // 2. Select 3-6 random tag codes
    const randomTags = [];
    const parentIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => 0.5 - Math.random()).slice(0, 3);
    parentIndices.forEach(pIdx => {
      const p = TAXONOMY[pIdx];
      // pick 1-2 random children from this parent
      const kids = p.children.sort(() => 0.5 - Math.random()).slice(0, 2);
      kids.forEach(k => randomTags.push(k.code));
    });

    // Wipe old tags for this user in this workspace
    await sb.from('user_tags').delete().eq('workspace_id', WS).eq('user_id', member.user_id);

    const userTagsToInsert = randomTags.map(code => ({
      workspace_id: WS,
      user_id: member.user_id,
      child_code: code
    }));

    const { error: tagLinkErr } = await sb.from('user_tags').insert(userTagsToInsert);
    if (tagLinkErr) {
      console.warn(`Lỗi liên kết sở thích cho user ${member.user_id}:`, tagLinkErr.message);
    } else {
      tagsLinked += userTagsToInsert.length;
    }
  }

  console.log(`✓ Đã tạo/đồng bộ hồ sơ user_profiles cho ${profilesInserted} thành viên.`);
  console.log(`✓ Đã gán thành công ${tagsLinked} liên kết sở thích vào user_tags để test matching.`);
  console.log('🎉 Toàn bộ quy trình seeding đã hoàn tất mỹ mãn!');
  process.exit(0);
} catch (err) {
  console.error('❌ Lỗi Seeding nghiêm trọng:', err.message);
  process.exit(1);
}
