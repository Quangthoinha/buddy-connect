import React, { useEffect, useMemo, useState } from 'react';
import { getContext, isInShell } from './lib/context.js';
import { callNative, bridge } from './lib/bridge.js';
import { db, dbPublic } from './lib/supabase.js';
import { listMembers } from './lib/members.js';
import {
  generateShareCode,
  redeemShareCode,
  listShareGrants,
  revokeShareGrant,
  useActiveScope,
  useIsAnyWorkspaceAdmin,
  useDefaultScopeInitializer,
} from './lib/sharing.js';
import { mushyApi } from './lib/mushy-api.js';
import { useDialog } from './components/Dialog.jsx';
import Select from './components/Select.jsx';
import ScopeSwitcher from './components/ScopeSwitcher.jsx';
import { subscribeToTable } from './lib/realtime.js';
import './App.css';

// Tag Taxonomy - 10 Parent Groups x 20 Child Tags = 200 Tags total
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

// Helper to flat list of all child tags
const FLAT_TAGS = TAXONOMY.reduce((acc, parent) => {
  return acc.concat(parent.children.map(c => ({ ...c, parent_code: parent.parent_code, parent_name: parent.parent_name })));
}, []);

export default function App() {
  const dialog = useDialog();
  const ctx = useMemo(() => getContext(), []);
  const scope = useActiveScope();
  const isAnyAdmin = useIsAnyWorkspaceAdmin();

  // Initialize scope
  useDefaultScopeInitializer();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' | 'rooms' | 'inbox' | 'profile'

  // Data states
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [myProfile, setMyProfile] = useState({
    department: '',
    facility: '',
    available_times: [],
  });
  const [myTags, setMyTags] = useState([]); // Selected child_codes

  const [members, setMembers] = useState([]); // Workspace members
  const [allProfiles, setAllProfiles] = useState({}); // user_id -> profile
  const [allUserTags, setAllUserTags] = useState({}); // user_id -> array of child_codes
  const [rooms, setRooms] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [interactionHistory, setInteractionHistory] = useState([]);

  // UI Interactivity states
  const [expandedParents, setExpandedParents] = useState({}); // parent_code -> boolean
  const [searchQuery, setSearchQuery] = useState('');
  const [fallbackEnabled, setFallbackEnabled] = useState(true);

  // Room Co-creation Form State
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({
    child_code: 'badminton',
    location: '',
    scheduled_at: '',
    max_participants: 2,
  });
  const [invitedGuests, setInvitedGuests] = useState([]); // selected guest user_ids
  const [submittingRoom, setSubmittingRoom] = useState(false);

  // Host Withdraw Form state
  const [showCancelModal, setShowCancelModal] = useState(null); // room object
  const [cancelReason, setCancelReason] = useState('Bận việc đột xuất');

  // Cross-Workspace Sharing states
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [shareCodeInput, setShareCodeInput] = useState('');
  const [shareGrants, setShareGrants] = useState([]);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [loadingGrants, setLoadingGrants] = useState(false);

  // 1. Fetch all data on mount and scope changes
  useEffect(() => {
    if (scope?.workspaceId) {
      loadData();
    }
  }, [scope?.workspaceId]);

  // 2. Setup Real-time Change Listeners
  useEffect(() => {
    if (!scope?.workspaceId) return;

    // Listen to rooms changes (realtime matching and slot indicators)
    const unsubRooms = subscribeToTable('rooms', scope.workspaceId, () => {
      loadRoomsData();
    });

    // Listen to invitations (accepted counts, expiring list)
    const unsubInvs = subscribeToTable('invitations', scope.workspaceId, () => {
      loadInvitationsData();
    });

    return () => {
      unsubRooms();
      unsubInvs();
    };
  }, [scope?.workspaceId]);

  // Load complete state from DB
  async function loadData() {
    setLoading(true);
    try {
      const activeWs = scope.workspaceId;
      if (!activeWs) return;

      // Run lazy daemon to clean up expired rooms
      await runLazyExpiryDaemon(activeWs);

      // 1. Fetch current user profile
      const { data: prof, error: profErr } = await db
        .from('user_profiles')
        .select('*')
        .eq('workspace_id', activeWs)
        .eq('user_id', ctx.userId)
        .maybeSingle();

      if (prof) {
        setMyProfile({
          department: prof.department || '',
          facility: prof.facility || '',
          available_times: prof.available_times || [],
        });
        setHasProfile(true);

        // Fetch my user_tags
        const { data: tags } = await db
          .from('user_tags')
          .select('child_code')
          .eq('workspace_id', activeWs)
          .eq('user_id', ctx.userId);
        setMyTags((tags || []).map(t => t.child_code));
      } else {
        setHasProfile(false);
        setShowProfileModal(true); // Force setup profile modal if empty
      }

      // 2. Fetch workspace members
      const workspaceMembers = await listMembers(activeWs);
      setMembers(workspaceMembers.filter(m => m.user_id !== ctx.userId));

      // 3. Fetch all profiles & tags in workspace to build match registry
      const { data: allProfs } = await db
        .from('user_profiles')
        .select('*')
        .eq('workspace_id', activeWs);
      const profMap = {};
      if (allProfs) {
        allProfs.forEach(p => { profMap[p.user_id] = p; });
      }
      setAllProfiles(profMap);

      const { data: allTags } = await db
        .from('user_tags')
        .select('*')
        .eq('workspace_id', activeWs);
      const tagsMap = {};
      if (allTags) {
        allTags.forEach(t => {
          if (!tagsMap[t.user_id]) tagsMap[t.user_id] = [];
          tagsMap[t.user_id].push(t.child_code);
        });
      }
      setAllUserTags(tagsMap);

      // 4. Fetch interaction history
      const { data: history } = await db
        .from('interaction_history')
        .select('*')
        .eq('workspace_id', activeWs);
      setInteractionHistory(history || []);

      // 5. Load Rooms & Invitations
      await loadRoomsData();
      await loadInvitationsData();

    } catch (err) {
      console.error('Lỗi tải dữ liệu Connect:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRoomsData() {
    const activeWs = scope.workspaceId;
    if (!activeWs) return;

    const { data: rms } = await db
      .from('rooms')
      .select('*')
      .eq('workspace_id', activeWs)
      .order('scheduled_at', { ascending: true });
    setRooms(rms || []);
  }

  async function loadInvitationsData() {
    const activeWs = scope.workspaceId;
    if (!activeWs) return;

    const { data: invs } = await db
      .from('invitations')
      .select('*')
      .eq('workspace_id', activeWs);
    setInvitations(invs || []);
  }

  // 8.1 Expiry Daemon: Client-side lazy sweep
  async function runLazyExpiryDaemon(activeWs) {
    try {
      const nowStr = new Date().toISOString();
      // Fetch open or filling rooms in the past
      const { data: expiredRooms } = await db
        .from('rooms')
        .select('id')
        .eq('workspace_id', activeWs)
        .in('status', ['open', 'filling'])
        .lt('scheduled_at', nowStr);

      if (expiredRooms && expiredRooms.length > 0) {
        const roomIds = expiredRooms.map(r => r.id);
        console.log('Lazy daemon detected expired rooms:', roomIds);

        // Update rooms status
        await db
          .from('rooms')
          .update({ status: 'expired', updated_at: nowStr })
          .in('id', roomIds);

        // Update all pending invitations for these rooms to expired
        await db
          .from('invitations')
          .update({ status: 'expired', updated_at: nowStr })
          .in('room_id', roomIds)
          .eq('status', 'pending');
      }
    } catch (e) {
      console.warn('Lỗi lazy daemon sweep:', e);
    }
  }

  // --- Profile / Tag Manager Handlers ---
  const toggleParentAccordion = (code) => {
    setExpandedParents(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const toggleSelectTag = (code) => {
    bridge.haptic('light');
    if (myTags.includes(code)) {
      setMyTags(prev => prev.filter(t => t !== code));
    } else {
      setMyTags(prev => [...prev, code]);
    }
  };

  const handleSaveProfile = async () => {
    if (!myProfile.department.trim() || !myProfile.facility.trim()) {
      return dialog.error('Thiếu thông tin', 'Vui lòng nhập đầy đủ Phòng ban và Cơ sở làm việc!');
    }

    try {
      bridge.haptic('medium');
      const activeWs = scope.workspaceId;

      // 1. Upsert profile
      const { error: profErr } = await db.from('user_profiles').upsert({
        user_id: ctx.userId,
        workspace_id: activeWs,
        department: myProfile.department.trim(),
        facility: myProfile.facility.trim(),
        available_times: myProfile.available_times,
        updated_at: new Date().toISOString()
      });
      if (profErr) throw profErr;

      // 2. Update user_tags: delete old, insert new
      await db.from('user_tags').delete().eq('workspace_id', activeWs).eq('user_id', ctx.userId);

      if (myTags.length > 0) {
        const tagsPayload = myTags.map(code => ({
          workspace_id: activeWs,
          user_id: ctx.userId,
          child_code: code
        }));
        const { error: tagsErr } = await db.from('user_tags').insert(tagsPayload);
        if (tagsErr) throw tagsErr;
      }

      setHasProfile(true);
      setShowProfileModal(false);
      await dialog.success('Đã lưu hồ sơ!', 'Thông tin kết nối của bạn đã được cập nhật thành công.');
      loadData();
    } catch (e) {
      dialog.error('Lỗi lưu hồ sơ', e.message);
    }
  };

  // --- Smart Matching & Sorting Priority Logic (PRD Section 5) ---
  const rankedCandidates = useMemo(() => {
    if (!hasProfile) return [];

    const myProfileData = allProfiles[ctx.userId] || {};
    const myInterests = myTags || [];

    return members
      .map(member => {
        const profile = allProfiles[member.user_id] || {};
        const tags = allUserTags[member.user_id] || [];

        // Check exact child tag overlap
        const exactMatches = myInterests.filter(code => tags.includes(code));
        const matchedChildObjects = exactMatches.map(code => FLAT_TAGS.find(t => t.code === code)).filter(Boolean);

        // Check parent tag overlap for fallback suggesting
        const myParentCodes = myInterests.map(code => FLAT_TAGS.find(t => t.code === code)?.parent_code).filter(Boolean);
        const memberParentCodes = tags.map(code => FLAT_TAGS.find(t => t.code === code)?.parent_code).filter(Boolean);
        const sharedParents = myParentCodes.filter(p => memberParentCodes.includes(p));

        // Check interaction history
        const hasInteracted = interactionHistory.some(h => 
          (h.user_id_1 === ctx.userId && h.user_id_2 === member.user_id) ||
          (h.user_id_1 === member.user_id && h.user_id_2 === ctx.userId)
        );

        // Priority calculation
        let priority = 3; // Mức 3 (mặc định)
        let exactMatchCount = exactMatches.length;
        let isFallback = false;
        let fallbackParentLabel = '';

        if (exactMatchCount > 0) {
          const differentDept = profile.department !== myProfile.department;
          if (differentDept && !hasInteracted) {
            priority = 1; // Mức 1 (Trùng thẻ con VÀ khác phòng ban VÀ chưa tương tác)
          } else if (!differentDept && !hasInteracted) {
            priority = 2; // Mức 2 (Trùng thẻ con VÀ cùng phòng ban VÀ chưa tương tác)
          }
        } else if (fallbackEnabled && sharedParents.length > 0) {
          // Trigger controlled fallback: no exact match, but share parent group
          isFallback = true;
          const matchedParentObj = TAXONOMY.find(p => p.parent_code === sharedParents[0]);
          fallbackParentLabel = matchedParentObj ? matchedParentObj.parent_name : '';
        }

        // Filter out if no exact match AND (fallback turned off or no parent matches)
        if (exactMatchCount === 0 && !isFallback) return null;

        // Calculate match percentage to display
        let matchScore = 30; // base weight
        matchScore += exactMatchCount * 25;
        matchScore += sharedParents.length * 10;
        if (profile.facility === myProfile.facility) matchScore += 15; // same office bonus
        if (matchScore > 99) matchScore = 99; // Cap at 99%

        return {
          member,
          profile,
          tags,
          exactMatches: matchedChildObjects,
          priority,
          isFallback,
          fallbackParentLabel,
          matchScore,
          hasInteracted
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Sort primarily by priority level (1 is highest, then 2, then 3)
        if (a.priority !== b.priority) return a.priority - b.priority;
        // Secondarily sort by higher match score
        return b.matchScore - a.matchScore;
      });
  }, [members, allProfiles, allUserTags, myTags, myProfile, interactionHistory, fallbackEnabled, hasProfile]);

  // --- Room Management Handlers ---

  // 6.2 Outbound Rate Quota Calculation
  const getOutboundLimit = (room) => {
    const acceptedCount = invitations.filter(i => i.room_id === room.id && i.status === 'accepted').length;
    const peopleJoined = acceptedCount + 1; // Host + accepted guests
    const slotsRemaining = room.max_participants - peopleJoined;
    return slotsRemaining * 3;
  };

  const getPendingInvitationsCount = (roomId) => {
    return invitations.filter(i => i.room_id === roomId && i.status === 'pending').length;
  };

  // Schedule Clash Detection Helper
  const checkScheduleClash = (scheduledTimeStr) => {
    const targetTime = new Date(scheduledTimeStr).getTime();
    const safetyWindow = 1.5 * 60 * 60 * 1000; // 1.5 hours in ms

    // Find any room that Guest has accepted (invitation status = accepted) OR hosting (host_id = userId)
    // where scheduled_at is within +/- 1.5 hours
    const clashingRooms = rooms.filter(room => {
      if (room.status === 'cancelled' || room.status === 'expired') return false;

      const roomTime = new Date(room.scheduled_at).getTime();
      const isClashing = Math.abs(roomTime - targetTime) < safetyWindow;
      if (!isClashing) return false;

      const isHost = room.host_id === ctx.userId;
      const isAcceptedGuest = invitations.some(i => i.room_id === room.id && i.receiver_id === ctx.userId && i.status === 'accepted');

      return isHost || isAcceptedGuest;
    });

    return clashingRooms[0] || null;
  };

  // Derived state for cascading selectors in room creation
  const selectedParentCode = useMemo(() => {
    const matched = FLAT_TAGS.find(t => t.code === newRoom.child_code);
    return matched ? matched.parent_code : TAXONOMY[0].parent_code;
  }, [newRoom.child_code]);

  const availableChildOptions = useMemo(() => {
    const parent = TAXONOMY.find(p => p.parent_code === selectedParentCode);
    return parent ? parent.children.map(c => ({ value: c.code, label: c.name })) : [];
  }, [selectedParentCode]);

  const handleParentChange = (parentCode) => {
    const parent = TAXONOMY.find(p => p.parent_code === parentCode);
    if (parent && parent.children.length > 0) {
      setNewRoom(prev => ({ ...prev, child_code: parent.children[0].code }));
    }
  };

  // Co-creation validation & submit
  const handleCreateRoomSubmit = async (e) => {
    e.preventDefault();

    if (!newRoom.location.trim() || !newRoom.scheduled_at) {
      return dialog.error('Thiếu thông tin', 'Vui lòng nhập vị trí và chọn thời gian hẹn.');
    }

    // 4.1 Co-creation requirement: must select at least 1 guest
    if (invitedGuests.length === 0) {
      return dialog.error('Ràng buộc tạo phòng', 'Hệ thống bắt buộc Host phải chọn ít nhất 1 người để gửi lời mời đầu tiên thì mới cho phép tạo phòng, tránh phòng mồ côi!');
    }

    setSubmittingRoom(true);
    try {
      const activeWs = scope.workspaceId;
      const nowStr = new Date().toISOString();

      // Check if Host has a schedule clash
      const clash = checkScheduleClash(newRoom.scheduled_at);
      if (clash) {
        setSubmittingRoom(false);
        const ok = await dialog.confirm(
          'Phát hiện trùng lịch trình!',
          `Bạn đã có lịch tham gia hoặc host kèo "${clash.location}" vào lúc ${formatTime(clash.scheduled_at)}. Bạn có chắc chắn muốn tiếp tục tạo kèo mới này không?`,
          { danger: true, confirmLabel: 'Tạo Kèo Mới', cancelLabel: 'Hủy' }
        );
        if (!ok) return;
        setSubmittingRoom(true);
      }

      // 1. Create Room
      const { data: room, error: roomErr } = await db
        .from('rooms')
        .insert({
          workspace_id: activeWs,
          host_id: ctx.userId,
          child_code: newRoom.child_code,
          location: newRoom.location.trim(),
          scheduled_at: new Date(newRoom.scheduled_at).toISOString(),
          max_participants: parseInt(newRoom.max_participants),
          status: 'open',
          version: 1
        })
        .select()
        .single();

      if (roomErr) throw roomErr;

      // 2. Dispatch Invitations
      const invitationsPayload = invitedGuests.map(receiverId => ({
        workspace_id: activeWs,
        room_id: room.id,
        receiver_id: receiverId,
        status: 'pending'
      }));

      const { error: invsErr } = await db.from('invitations').insert(invitationsPayload);
      if (invsErr) throw invsErr;

      // 3. Reset form
      setShowCreateRoom(false);
      setInvitedGuests([]);
      setNewRoom({
        child_code: 'badminton',
        location: '',
        scheduled_at: '',
        max_participants: 2,
      });

      bridge.haptic('success');
      await dialog.success('Tạo phòng thành công!', 'Phòng hẹn đã được khởi tạo và phát đi các lời mời đầu tiên.');
      loadData();

      // Super App Push Notification
      try {
        await mushyApi.push({
          title: `🍄 Lời mời Connect mới!`,
          body: `Bạn được mời tham gia kèo: "${room.location}".`,
          userIds: invitedGuests,
          data: { appSlug: 'buddy-connect', screen: 'inbox' }
        });
      } catch (err) {
        console.warn('Push error:', err);
      }

    } catch (e) {
      dialog.error('Lỗi tạo phòng', e.message);
    } finally {
      setSubmittingRoom(false);
    }
  };

  // 6.3 Schedule Clash & Accept Invitation Handler
  const handleAcceptInvitation = async (inv) => {
    try {
      bridge.haptic('light');
      const activeWs = scope.workspaceId;
      const room = rooms.find(r => r.id === inv.room_id);
      if (!room) return;

      // Fetch latest state of the room to prevent race condition
      const { data: latestRoom } = await db
        .from('rooms')
        .select('*')
        .eq('id', room.id)
        .single();

      if (!latestRoom || latestRoom.status === 'matched' || latestRoom.status === 'expired' || latestRoom.status === 'cancelled') {
        return dialog.error('Không thể tham gia', 'Rất tiếc, phòng hẹn đã đủ thành viên hoặc không còn khả dụng.');
      }

      // Schedule clash check
      const clash = checkScheduleClash(room.scheduled_at);
      if (clash) {
        const confirmSwitch = await dialog.confirm(
          'Đụng độ lịch trình!',
          `Bạn đã có lịch tham gia kèo khác vào khung giờ này (${formatTime(clash.scheduled_at)}). Bạn có chắc chắn muốn rút lui khỏi kèo cũ để tham gia kèo mới này không?`,
          { danger: true, confirmLabel: 'Đồng ý Đổi Kèo', cancelLabel: 'Giữ Kèo Cũ' }
        );

        if (!confirmSwitch) return;

        // Auto withdraw from the clashing old room
        if (clash.host_id === ctx.userId) {
          // If you are the Host of the old room, you must cancel it
          await db
            .from('rooms')
            .update({ status: 'cancelled', cancel_reason: 'Host chuyển sang kèo khác', updated_at: new Date().toISOString() })
            .eq('id', clash.id);
        } else {
          // If you are a Guest in the old room, change old invitation to declined
          await db
            .from('invitations')
            .update({ status: 'declined', updated_at: new Date().toISOString() })
            .eq('room_id', clash.id)
            .eq('receiver_id', ctx.userId)
            .eq('status', 'accepted');
        }
      }

      // 6.1 Multi-Participant Accept logic
      // Lock room with optimistic locking via version increment
      const nextVersion = latestRoom.version + 1;
      const { data: updatedRoom, error: updateErr } = await db
        .from('rooms')
        .update({ version: nextVersion, updated_at: new Date().toISOString() })
        .eq('id', room.id)
        .eq('version', latestRoom.version)
        .select()
        .single();

      if (updateErr || !updatedRoom) {
        // Race condition: someone else accepted first
        return dialog.error('Tranh chấp slot', 'Phòng vừa mới được lấp đầy hoặc trạng thái đã thay đổi. Vui lòng thử kèo khác nhé!');
      }

      // Accept current invitation
      await db
        .from('invitations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', inv.id);

      // Recalculate participant counts
      const currentAccepted = invitations.filter(i => i.room_id === room.id && i.status === 'accepted').length + 1; // including the new acceptance
      const totalParticipants = currentAccepted + 1; // + Host

      if (totalParticipants >= room.max_participants) {
        // 6.1 Lock the room, set to matched and expire other pending invitations
        await db
          .from('rooms')
          .update({ status: 'matched', updated_at: new Date().toISOString() })
          .eq('id', room.id);

        await db
          .from('invitations')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('room_id', room.id)
          .eq('status', 'pending');

        // Add symmetric interactions between all participants to interaction_history
        await recordInteractionHistory(room.id, room.host_id);

        // 7.1 Native chat creation via JS Bridge
        await createRoomNativeChat(room.id, room.location);
      } else {
        // Update to filling state
        await db
          .from('rooms')
          .update({ status: 'filling', updated_at: new Date().toISOString() })
          .eq('id', room.id);
      }

      bridge.haptic('success');
      loadData();
    } catch (e) {
      dialog.error('Lỗi khi chấp nhận', e.message);
    }
  };

  // Record symmetric connection chéo history (PRD Section 3)
  const recordInteractionHistory = async (roomId, hostId) => {
    try {
      const activeWs = scope.workspaceId;
      // Get all accepted participants in this room
      const { data: accInvs } = await db
        .from('invitations')
        .select('receiver_id')
        .eq('room_id', roomId)
        .eq('status', 'accepted');

      if (!accInvs) return;

      const participantIds = [hostId, ...accInvs.map(i => i.receiver_id)];

      // Build symmetric pairs: always store user_id_1 < user_id_2
      const historyPayload = [];
      for (let i = 0; i < participantIds.length; i++) {
        for (let j = i + 1; j < participantIds.length; j++) {
          const id1 = participantIds[i] < participantIds[j] ? participantIds[i] : participantIds[j];
          const id2 = participantIds[i] < participantIds[j] ? participantIds[j] : participantIds[i];

          historyPayload.push({
            workspace_id: activeWs,
            user_id_1: id1,
            user_id_2: id2
          });
        }
      }

      if (historyPayload.length > 0) {
        // Use upsert to avoid duplicate key errors
        await db.from('interaction_history').upsert(historyPayload);
      }
    } catch (e) {
      console.warn('Lỗi ghi chép lịch sử tương tác:', e);
    }
  };

  // Native chat group generator (PRD Section 7)
  const createRoomNativeChat = async (roomId, roomLocation) => {
    try {
      // Fetch room participants to invite to the chat group
      const activeWs = scope.workspaceId;
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      const accGuests = invitations.filter(i => i.room_id === roomId && i.status === 'accepted').map(i => i.receiver_id);
      const participantIds = [room.host_id, ...accGuests];

      // Call Native Shell Bridge
      const nativeChatResult = await callNative('CREATE_CHAT_GROUP', {
        title: `💬 Connect Room: ${roomLocation.substring(0, 20)}`,
        userIds: participantIds
      });

      const chatGroupId = nativeChatResult?.chatGroupId || `mock-chat-${Math.random().toString(36).substring(2, 9)}`;

      // Update room in DB
      await db
        .from('rooms')
        .update({ chat_group_id: chatGroupId, updated_at: new Date().toISOString() })
        .eq('id', roomId);

      console.log('✓ Khởi tạo nhóm chat thành công:', chatGroupId);
    } catch (e) {
      console.warn('Lỗi JS Bridge CREATE_CHAT_GROUP. Phòng hẹn sẽ hiển thị kết nối bù.', e);
    }
  };

  // 7.1 Distributed Fault-Tolerance reconnection trigger
  const handleReconnectChat = async (room) => {
    bridge.haptic('light');
    await createRoomNativeChat(room.id, room.location);
    loadData();
  };

  // Host withdraw/cancel with reasons (PRD Section 7.2)
  const handleCancelRoomSubmit = async () => {
    if (!showCancelModal) return;

    try {
      bridge.haptic('medium');
      const room = showCancelModal;
      const activeWs = scope.workspaceId;
      const nowStr = new Date().toISOString();

      // 1. Update room status to cancelled
      await db
        .from('rooms')
        .update({
          status: 'cancelled',
          cancel_reason: cancelReason,
          updated_at: nowStr
        })
        .eq('id', room.id);

      // 2. Set pending/accepted invitations to declined/expired
      await db
        .from('invitations')
        .update({ status: 'declined', updated_at: nowStr })
        .eq('room_id', room.id);

      // 3. Send distributed native chat announcement message via bridge
      if (room.chat_group_id) {
        const cancelMsg = `🚨 Thông báo: Host đã hủy kèo đi chill này với lý do: "[Lý do Host nhập: ${cancelReason}]". Nhóm chat sẽ đóng lại tại đây. Hẹn gặp mọi người ở các kèo sau nhé 🍄.`;
        try {
          await callNative('SEND_CHAT_MESSAGE', {
            chatGroupId: room.chat_group_id,
            message: cancelMsg
          });
          // Transition group to Read-only
          await callNative('LOCK_CHAT_GROUP_READONLY', {
            chatGroupId: room.chat_group_id
          });
        } catch (bridgeErr) {
          console.warn('Không gửi được tin nhắn bù do bridge lỗi:', bridgeErr);
        }
      }

      setShowCancelModal(null);
      await dialog.success('Đã hủy phòng hẹn', 'Hệ thống đã đóng phòng và gửi thông báo văn minh đến các thành viên.');
      loadData();
    } catch (e) {
      dialog.error('Lỗi hủy phòng', e.message);
    }
  };

  const handleDeclineInvitation = async (inv) => {
    try {
      bridge.haptic('light');
      await db
        .from('invitations')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', inv.id);

      // If room was filling, update room back to open if no guest remains
      const room = rooms.find(r => r.id === inv.room_id);
      if (room && room.status === 'filling') {
        const remainingGuests = invitations.filter(i => i.room_id === room.id && i.status === 'accepted' && i.id !== inv.id).length;
        if (remainingGuests === 0) {
          await db
            .from('rooms')
            .update({ status: 'open', updated_at: new Date().toISOString() })
            .eq('id', room.id);
        }
      }

      loadData();
    } catch (e) {
      dialog.error('Lỗi từ chối', e.message);
    }
  };

  const handleInviteAdditionalGuest = async (roomId, guestId) => {
    try {
      bridge.haptic('light');
      const activeWs = scope.workspaceId;
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      // Rate Limit quota check
      const currentPending = getPendingInvitationsCount(roomId);
      const allowedLimit = getOutboundLimit(room);

      if (currentPending >= allowedLimit) {
        return dialog.error(
          'Chặn hạn ngạch!',
          `Không thể mời thêm. Số lời mời pending tối đa của phòng này tại thời điểm này là: ${allowedLimit} lời mời. Vui lòng bấm nút [Thu hồi] các lời mời cũ để nhường chỗ.`
        );
      }

      await db.from('invitations').insert({
        workspace_id: activeWs,
        room_id: roomId,
        receiver_id: guestId,
        status: 'pending'
      });

      loadData();
    } catch (e) {
      dialog.error('Lỗi mời thêm', e.message);
    }
  };

  const handleRevokeInvitation = async (invId) => {
    try {
      bridge.haptic('light');
      await db.from('invitations').delete().eq('id', invId);
      loadData();
    } catch (e) {
      dialog.error('Lỗi thu hồi', e.message);
    }
  };

  // --- Sharing Modal Handlers ---
  const handleOpenSharing = async () => {
    setShowSharingModal(true);
    setLoadingGrants(true);
    setGeneratedCode(null);
    try {
      const grants = await listShareGrants();
      setShareGrants(grants);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGrants(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      bridge.haptic('light');
      const codeData = await generateShareCode({ expiresHours: 24 });
      setGeneratedCode(codeData);
      const grants = await listShareGrants();
      setShareGrants(grants);
    } catch (err) {
      dialog.error('Lỗi tạo mã', err.message);
    }
  };

  const handleRedeemCode = async () => {
    if (!shareCodeInput.trim()) return;
    try {
      bridge.haptic('light');
      await redeemShareCode({ code: shareCodeInput.trim().toUpperCase() });
      setShareCodeInput('');
      await dialog.success('Kết nối thành công!', 'Đã mở rộng phạm vi kết nối với workspace chia sẻ.');
      const grants = await listShareGrants();
      setShareGrants(grants);
      loadData();
    } catch (err) {
      dialog.error('Lỗi redeem', err.message);
    }
  };

  const handleRevokeGrant = async (grantId) => {
    const ok = await dialog.confirm('Hủy kết nối chia sẻ này?', 'Hai bên sẽ không còn nhìn thấy thông tin của nhau nữa.', {
      danger: true,
      confirmLabel: 'Hủy kết nối',
      cancelLabel: 'Bỏ qua',
    });
    if (!ok) return;

    try {
      bridge.haptic('medium');
      await revokeShareGrant(grantId);
      const grants = await listShareGrants();
      setShareGrants(grants);
      loadData();
    } catch (err) {
      dialog.error('Lỗi hủy chia sẻ', err.message);
    }
  };

  // --- UI Filters and highlights ---
  const filteredAccordionTaxonomy = useMemo(() => {
    if (!searchQuery.trim()) return TAXONOMY;

    const query = searchQuery.toLowerCase().trim();
    return TAXONOMY.map(parent => {
      const matchedChildren = parent.children.filter(c => c.name.toLowerCase().includes(query));
      if (matchedChildren.length > 0 || parent.parent_name.toLowerCase().includes(query)) {
        return {
          ...parent,
          children: matchedChildren.length > 0 ? matchedChildren : parent.children,
          isAutoExpanded: true
        };
      }
      return null;
    }).filter(Boolean);
  }, [searchQuery]);

  const highlightSearchText = (text, query) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="highlighted-text">{part}</span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Time Formatter
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return `${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
  };

  // Get tag name from child code
  const getTagName = (code) => {
    const tag = FLAT_TAGS.find(t => t.code === code);
    return tag ? tag.name : code;
  };

  return (
    <div className="mushy-page">
      {/* Header section */}
      <header className="app-header">
        <div className="brand-section">
          <span className="brand-icon">🍄</span>
          <div>
            <h1 className="brand-name">Mushy Connect</h1>
            <p className="brand-tagline">Tự tạo phòng hẹn nhanh đi chill & thể thao</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ScopeSwitcher onManageGrants={handleOpenSharing} />
          <button
            type="button"
            className="mushy-btn"
            style={{
              minWidth: 40,
              width: 40,
              height: 40,
              minHeight: 40,
              borderRadius: '50%',
              padding: 0,
              background: 'var(--surface-muted)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              cursor: 'pointer',
              boxShadow: 'none'
            }}
            onClick={() => { bridge.haptic('light'); setShowProfileModal(true); }}
            title="Thiết lập hồ sơ"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-navigation">
        <button
          className={`nav-tab-btn ${activeTab === 'radar' ? 'nav-tab-btn--active' : ''}`}
          onClick={() => { bridge.haptic('light'); setActiveTab('radar'); }}
        >
          <span>🛰️</span> Radar
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'rooms' ? 'nav-tab-btn--active' : ''}`}
          onClick={() => { bridge.haptic('light'); setActiveTab('rooms'); }}
        >
          <span>🏆</span> Phòng Hẹn
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'inbox' ? 'nav-tab-btn--active' : ''}`}
          onClick={() => { bridge.haptic('light'); setActiveTab('inbox'); }}
        >
          <span>📥</span> Lời Mời
          {invitations.filter(i => i.receiver_id === ctx.userId && i.status === 'pending').length > 0 && (
            <span className="notification-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', marginLeft: 2 }} />
          )}
        </button>
      </nav>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <span className="mushy-spinner" style={{ width: 32, height: 32, color: 'var(--brand)' }} />
        </div>
      ) : (
        <>
          {/* TAB 1: RADAR */}
          {activeTab === 'radar' && (
            <div className="tab-pane animated-fade-in">
              {!hasProfile ? (
                <section className="mushy-card" style={{ textAlign: 'center', padding: '30px 18px' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🛰️</div>
                  <h3 className="mushy-section-title" style={{ justifyContent: 'center' }}>Chưa thiết lập hồ sơ Connect</h3>
                  <p className="mushy-section-sub">
                    Nhập phòng ban, cơ sở và các thẻ sở thích dạng Accordion để khởi động radar xếp hạng ưu tiên chéo cực đỉnh nào!
                  </p>
                  <button className="mushy-btn mushy-btn--primary" onClick={() => { bridge.haptic('light'); setShowProfileModal(true); }}>
                    Tạo Hồ Sơ Ngay
                  </button>
                </section>
              ) : (
                <>
                  <section className="mushy-card" style={{ marginBottom: 16 }}>
                    <div className="radar-container">
                      <div className="radar-backdrop">
                        <span className="radar-avatar">👽</span>
                      </div>
                      <h3 className="mushy-section-title" style={{ margin: '8px 0 2px' }}>Connect Radar đang quét</h3>
                      <p className="mushy-section-sub" style={{ margin: 0, textAlign: 'center' }}>
                        So khớp sở thích chéo với các đồng nghiệp thuộc tổ chức <strong>{scope.label}</strong>
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                        <input
                          type="checkbox"
                          id="fallback-mode"
                          checked={fallbackEnabled}
                          onChange={(e) => setFallbackEnabled(e.target.checked)}
                          style={{ accentColor: 'var(--brand)' }}
                        />
                        <label htmlFor="fallback-mode" style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                          Cho phép gợi ý bộ môn cùng nhóm khi thiếu người
                        </label>
                      </div>
                    </div>
                  </section>

                  {rankedCandidates.length === 0 ? (
                    <div className="mushy-empty-state animated-fade-in">
                      <div className="mushy-empty-icon">🛰️</div>
                      <h4 className="mushy-empty-title">Radar chưa quét thấy ai</h4>
                      <p className="mushy-empty-desc">Không tìm thấy đồng nghiệp nào trùng thẻ sở thích với bạn. Hãy thử đổi sở thích hoặc chia sẻ workspace nhé!</p>
                    </div>
                  ) : (
                    rankedCandidates.map(({ member, profile, tags, exactMatches, priority, isFallback, fallbackParentLabel, matchScore, hasInteracted }) => (
                      <section key={member.user_id} className="mushy-card buddy-card">
                        <div className="buddy-glow-effect" />
                        <div className="buddy-card-header">
                          <div className="buddy-avatar-wrapper">
                            <span>{member.full_name?.charAt(0)}</span>
                          </div>
                          <div className="buddy-info">
                            <h4 className="buddy-name">
                              {member.full_name}
                              <span style={{ fontSize: 10, fontWeight: 'normal', color: 'var(--muted)', background: 'rgba(15,15,18,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                                {profile.department || 'Phòng ban'}
                              </span>
                            </h4>
                            <p className="buddy-status-text" style={{ fontSize: 11 }}>
                              📍 {profile.facility || 'Cơ sở'} · ⏱️ {profile.available_times?.join(', ') || 'Chưa cập nhật giờ rảnh'}
                            </p>
                          </div>
                          <div
                            className="match-score-badge"
                            style={{
                              background: priority === 1 ? 'var(--gradient-match)' : priority === 2 ? 'var(--gradient-purple)' : 'var(--gradient-cyan)',
                            }}
                          >
                            <div>{matchScore}%</div>
                            <div style={{ fontSize: 8, opacity: 0.8, fontWeight: 'normal' }}>Match</div>
                          </div>
                        </div>

                        {/* Priority Badge Indicator */}
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                          {priority === 1 && <span style={{ fontSize: 10, background: 'rgba(230,57,70,0.1)', color: 'var(--brand)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>🔥 Ưu tiên cao (Khác phòng ban)</span>}
                          {priority === 2 && <span style={{ fontSize: 10, background: 'rgba(168,85,247,0.1)', color: '#A855F7', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>👥 Cùng phòng ban</span>}
                          {hasInteracted && <span style={{ fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>⇆ Đã từng tương tác</span>}
                          {isFallback && <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.1)', color: '#D97706', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>💡 Gợi ý tương tự cùng nhóm [{fallbackParentLabel}]</span>}
                        </div>

                        {/* Tags list */}
                        <div className="buddy-tags-grid">
                          {exactMatches.map(tag => (
                            <span key={tag.code} className="buddy-tag buddy-tag--shared">
                              ❤️ {tag.name}
                            </span>
                          ))}
                          {tags.filter(code => !exactMatches.some(em => em.code === code)).slice(0, 4).map(code => (
                            <span key={code} className="buddy-tag">
                              {getTagName(code)}
                            </span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="buddy-actions">
                          <button
                            className="mushy-btn mushy-btn--primary"
                            onClick={() => {
                              bridge.haptic('light');
                              setNewRoom(prev => ({
                                ...prev,
                                child_code: exactMatches[0]?.code || tags[0] || 'badminton',
                              }));
                              setInvitedGuests([member.user_id]);
                              setShowCreateRoom(true);
                              setActiveTab('rooms');
                            }}
                          >
                            🏸 Rủ lập kèo Connect
                          </button>

                          {member.work_phone ? (
                            <button
                              className="mushy-btn mushy-btn--ghost"
                              style={{ padding: '10px 14px' }}
                              onClick={() => {
                                bridge.haptic('light');
                                bridge.tel(member.work_phone);
                              }}
                            >
                              📞 Gọi
                            </button>
                          ) : (
                            <button
                              className="mushy-btn mushy-btn--ghost"
                              style={{ padding: '10px 14px', opacity: 0.4 }}
                              onClick={() => {
                                dialog.info('Thông tin liên hệ', `${member.full_name} chưa cập nhật số điện thoại native.`);
                              }}
                            >
                              📞
                            </button>
                          )}
                        </div>
                      </section>
                    ))
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: ROOMS - PHÒNG HẸN KẾT NỐI */}
          {activeTab === 'rooms' && (
            <div className="tab-pane animated-fade-in">
              <section className="mushy-card premium-glow-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 className="mushy-section-title" style={{ margin: 0 }}>🏆 Phòng hẹn Connect</h3>
                    <p className="mushy-section-sub" style={{ margin: '4px 0 0' }}>Tự lập hoặc tham gia phòng đi chill, thể thao cùng đồng nghiệp</p>
                  </div>
                  <button
                    className={`mushy-btn ${showCreateRoom ? 'mushy-btn--ghost' : 'mushy-btn--primary'}`}
                    style={{ 
                      padding: '8px 16px', 
                      minHeight: 40,
                      color: showCreateRoom ? 'var(--brand)' : undefined,
                      borderColor: showCreateRoom ? 'var(--brand)' : undefined
                    }}
                    onClick={() => {
                      bridge.haptic('light');
                      setShowCreateRoom(!showCreateRoom);
                    }}
                  >
                    {showCreateRoom ? 'Hủy' : '+ Lập Kèo'}
                  </button>
                </div>

                {/* Create Room Form */}
                {showCreateRoom && (
                  <form onSubmit={handleCreateRoomSubmit} className="form-slide-down" style={{ marginTop: 20, borderTop: '1px solid var(--hairline)', paddingTop: 16 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label className="mushy-label">Danh mục chính</label>
                        <Select
                          value={selectedParentCode}
                          onChange={handleParentChange}
                          options={TAXONOMY.map(p => ({ value: p.parent_code, label: p.parent_name }))}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="mushy-label">Bộ môn / Sở thích cụ thể</label>
                        <Select
                          value={newRoom.child_code}
                          onChange={(val) => setNewRoom(prev => ({ ...prev, child_code: val }))}
                          options={availableChildOptions}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label className="mushy-label">Vị trí / Địa điểm hẹn</label>
                      <input
                        type="text"
                        className="mushy-input"
                        placeholder="Vd: Sân cầu lông Thượng Đình, 345 Nguyễn Trãi..."
                        value={newRoom.location}
                        onChange={(e) => setNewRoom(prev => ({ ...prev, location: e.target.value }))}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label className="mushy-label">Thời gian hẹn tổ chức</label>
                        <input
                          type="datetime-local"
                          className="mushy-input"
                          style={{ padding: '10px 14px', fontSize: '13.5px', minHeight: '44px' }}
                          value={newRoom.scheduled_at}
                          onChange={(e) => setNewRoom(prev => ({ ...prev, scheduled_at: e.target.value }))}
                          required
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="mushy-label">Sĩ số tối đa (cả Host)</label>
                        <input
                          type="number"
                          className="mushy-input"
                          min="2"
                          style={{ padding: '10px 14px', fontSize: '13.5px', minHeight: '44px' }}
                          value={newRoom.max_participants}
                          onChange={(e) => setNewRoom(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 2 }))}
                          required
                        />
                      </div>
                    </div>

                    {/* Guest picker to enforce co-creation (PRD Section 4) */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="mushy-label" style={{ color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--brand)' }}>⚠️</span> Gửi lời mời đầu tiên (Chọn ít nhất 1 người)
                      </label>
                      <div className="guest-selector-scroll" style={{ background: 'var(--surface-muted)', border: '1.5px solid var(--hairline)' }}>
                        {members.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '16px 8px', color: 'var(--muted)' }}>
                            <span style={{ fontSize: 24, display: 'block', marginBottom: 4 }}>👥💤</span>
                            <span style={{ fontSize: 12, fontStyle: 'italic' }}>Mọi người trong Workspace hiện đều bận hoặc offline. Bạn có thể tự tạo phòng chờ trước.</span>
                          </div>
                        ) : (
                          members.map(m => {
                            const isSelected = invitedGuests.includes(m.user_id);
                            return (
                              <div
                                key={m.user_id}
                                className={`guest-select-item ${isSelected ? 'guest-select-item--selected' : ''}`}
                                onClick={() => {
                                  if (isSelected) {
                                    setInvitedGuests(prev => prev.filter(id => id !== m.user_id));
                                  } else {
                                    setInvitedGuests(prev => [...prev, m.user_id]);
                                  }
                                }}
                              >
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.full_name}</span>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  style={{ accentColor: 'var(--brand)' }}
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="mushy-btn mushy-btn--primary mushy-btn--block"
                      disabled={submittingRoom || invitedGuests.length === 0}
                    >
                      {submittingRoom ? <span className="mushy-spinner" /> : 'Xác nhận tạo phòng & Gửi lời mời 🚀'}
                    </button>
                  </form>
                )}
              </section>

              {/* Rooms list */}
              {rooms.length === 0 ? (
                <div className="mushy-empty-state animated-fade-in">
                  <div className="mushy-empty-icon">🏆✨</div>
                  <h4 className="mushy-empty-title">Chưa có phòng hẹn nào được tạo</h4>
                  <p className="mushy-empty-desc">Hãy là người tiên phong lập kèo thể thao hoặc đi chill đầu tiên cùng các đồng nghiệp nhé!</p>
                </div>
              ) : (
                rooms.map(room => {
                  const isHost = room.host_id === ctx.userId;
                  const roomInvs = invitations.filter(i => i.room_id === room.id);
                  const acceptedCount = roomInvs.filter(i => i.status === 'accepted').length;
                  const totalJoined = acceptedCount + 1; // including Host
                  const isFull = totalJoined >= room.max_participants;
                  
                  const hostMemberObj = members.find(m => m.user_id === room.host_id) || (isHost ? { full_name: 'Bạn' } : { full_name: 'Đồng nghiệp' });

                  // 6.2 Rate limit parameters
                  const pendingCount = roomInvs.filter(i => i.status === 'pending').length;
                  const currentLimit = getOutboundLimit(room);
                  const isQuotaExceeded = pendingCount >= currentLimit;

                  return (
                    <div key={room.id} className="mushy-card activity-card" style={{ marginBottom: 14 }}>
                      <div className={`activity-type-banner act-badge-sports`}>
                        {FLAT_TAGS.find(t => t.code === room.child_code)?.name?.charAt(0) || '🏸'}
                      </div>
                      <h4 className="activity-title" style={{ fontSize: 16 }}>
                        {getTagName(room.child_code)} · {room.location}
                      </h4>
                      <p className="activity-desc" style={{ fontSize: 12, margin: '4px 0 8px' }}>
                        Host bởi: <strong>{hostMemberObj.full_name}</strong>
                      </p>

                      <div className="activity-meta-row">
                        <div className="activity-meta-item">
                          <span>⏰ Hẹn vào:</span> <strong>{formatTime(room.scheduled_at)}</strong>
                        </div>
                      </div>

                      {/* Display Room state (PRD Section 6.1) */}
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                        {room.status === 'open' && <span className="mushy-status --warn" style={{ fontSize: 11, padding: '2px 8px' }}><span className="mushy-status-dot" />Mới lập (open)</span>}
                        {room.status === 'filling' && <span className="mushy-status --warn" style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(6,182,212,0.1)', color: '#06B6D4' }}><span className="mushy-status-dot" style={{ background: '#06B6D4' }} />Đang gom slot ({totalJoined}/{room.max_participants})</span>}
                        {room.status === 'matched' && <span className="mushy-status --ok" style={{ fontSize: 11, padding: '2px 8px' }}><span className="mushy-status-dot" />Đã ghép đủ (matched)</span>}
                        {room.status === 'cancelled' && <span className="mushy-status --err" style={{ fontSize: 11, padding: '2px 8px' }}><span className="mushy-status-dot" />Đã hủy</span>}
                        {room.status === 'expired' && <span className="mushy-status --err" style={{ fontSize: 11, padding: '2px 8px', background: '#E5E7EB', color: '#9CA3AF' }}><span className="mushy-status-dot" style={{ background: '#9CA3AF' }} />Hết hạn</span>}
                      </div>

                      {room.status === 'cancelled' && room.cancel_reason && (
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', fontStyle: 'italic' }}>
                          Lý do hủy: "{room.cancel_reason}"
                        </div>
                      )}

                      {/* Members Avatars Joined */}
                      <div className="participants-container">
                        <div className="participants-avatars">
                          <div className="participant-avatar-icon" title="Host">
                            <span>👑</span>
                          </div>
                          {roomInvs.filter(i => i.status === 'accepted').map(inv => {
                            const guest = members.find(m => m.user_id === inv.receiver_id) || (inv.receiver_id === ctx.userId ? { full_name: 'Bạn' } : { full_name: 'Đồng nghiệp' });
                            return (
                              <div key={inv.id} className="participant-avatar-icon" title={guest.full_name}>
                                <span>{guest.full_name?.charAt(0)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <span className="participants-status-text">
                          Sĩ số: {totalJoined} / {room.max_participants}
                        </span>
                      </div>

                      {/* 7.1 Distributed Fault-Tolerance Group Chat Status */}
                      {room.status === 'matched' && (
                        <div style={{ marginTop: 12, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '8px 12px' }}>
                          {room.chat_group_id ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>💬 Nhóm chat Super App đã sẵn sàng!</span>
                              <button
                                className="mushy-btn"
                                style={{ minHeight: 30, fontSize: 11, padding: '4px 10px', background: '#10B981', color: '#fff' }}
                                onClick={() => {
                                  bridge.haptic('light');
                                  callNative('OPEN_CHAT_GROUP', { chatGroupId: room.chat_group_id });
                                }}
                              >
                                Vào Chat
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>⏳ Đang khởi tạo nhóm kết nối...</span>
                              <button
                                className="mushy-btn mushy-btn--ghost"
                                style={{ minHeight: 30, fontSize: 11, padding: '4px 10px', color: '#D97706', borderColor: '#F59E0B' }}
                                onClick={() => handleReconnectChat(room)}
                              >
                                Kết nối lại nhóm chat
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Host Actions: Invite more or Cancel room */}
                      {isHost && (room.status === 'open' || room.status === 'filling' || room.status === 'matched') && (
                        <div style={{ marginTop: 14, borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
                          <h5 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>Bảng điều khiển của Host:</h5>

                          {/* Rate limiting indicator */}
                          <div className="quota-indicator">
                            Hạn ngạch lời mời pending: <strong>{pendingCount}/{currentLimit}</strong> (Công thức: <code>(Sĩ số - Đã tham gia) * 3</code>)
                          </div>

                          {/* Invite more candidates drop grid */}
                          {!isFull && room.status !== 'matched' && (
                            <div style={{ marginTop: 8 }}>
                              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Mời thêm ứng viên mới:</label>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {members
                                  .filter(m => !roomInvs.some(i => i.receiver_id === m.user_id))
                                  .map(m => (
                                    <button
                                      key={m.user_id}
                                      className="mushy-btn mushy-btn--ghost"
                                      disabled={isQuotaExceeded}
                                      style={{ padding: '4px 8px', minHeight: 30, fontSize: 11 }}
                                      onClick={() => handleInviteAdditionalGuest(room.id, m.user_id)}
                                    >
                                      + {m.full_name}
                                    </button>
                                  ))}
                              </div>
                              {isQuotaExceeded && (
                                <p style={{ fontSize: 10, color: 'var(--danger)', margin: '4px 0 0' }}>
                                  ⚠️ Đã đạt giới hạn pending ({pendingCount}). Vui lòng thu hồi bớt các lời mời cũ bên dưới để có thể mời tiếp.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Display pending list with Revoke option */}
                          {roomInvs.filter(i => i.status === 'pending').length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Lời mời đang chờ:</span>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                {roomInvs.filter(i => i.status === 'pending').map(inv => {
                                  const invitedGuest = members.find(m => m.user_id === inv.receiver_id) || { full_name: 'Ứng viên' };
                                  return (
                                    <span key={inv.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(15,15,18,0.03)', padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>
                                      {invitedGuest.full_name}
                                      <button
                                        style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                                        onClick={() => handleRevokeInvitation(inv.id)}
                                      >
                                        [Thu hồi]
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Withdraw cancellation button */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <button
                              className="mushy-btn mushy-btn--ghost"
                              style={{ color: 'var(--danger)', borderColor: 'var(--danger)', minHeight: 36, fontSize: 12, padding: '4px 12px' }}
                              onClick={() => {
                                setCancelReason('Bận việc đột xuất');
                                setShowCancelModal(room);
                              }}
                            >
                              🚨 Hủy phòng hẹn văn minh
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: INBOX - HỘP THƯ LỜI MỜI NHẬN ĐƯỢC */}
          {activeTab === 'inbox' && (
            <div className="tab-pane animated-fade-in">
              <section className="mushy-card" style={{ marginBottom: 16 }}>
                <h3 className="mushy-section-title" style={{ margin: 0 }}>📥 Hộp thư lời mời Connect</h3>
                <p className="mushy-section-sub" style={{ margin: '4px 0 0' }}>Lời mời bạn nhận được từ các phòng hẹn Connect của đồng nghiệp</p>
              </section>

              {invitations.filter(i => i.receiver_id === ctx.userId).length === 0 ? (
                <div className="mushy-empty-state animated-fade-in">
                  <div className="mushy-empty-icon">📥</div>
                  <h4 className="mushy-empty-title">Hộp thư lời mời trống</h4>
                  <p className="mushy-empty-desc">Hiện chưa có lời mời Connect nào gửi tới bạn. Hãy thử đổi sở thích hoặc chủ động lập kèo trước nhé!</p>
                </div>
              ) : (
                invitations
                  .filter(i => i.receiver_id === ctx.userId)
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map(inv => {
                    const room = rooms.find(r => r.id === inv.room_id);
                    if (!room) return null;

                    const isExpired = inv.status === 'expired' || room.status === 'expired' || room.status === 'cancelled';
                    const hostObj = members.find(m => m.user_id === room.host_id) || { full_name: 'Đồng nghiệp' };

                    return (
                      <div
                        key={inv.id}
                        className={`mushy-card invitation-card ${isExpired ? 'invitation-card--expired' : ''}`}
                        style={{ marginBottom: 14 }}
                      >
                        <div className="buddy-card-header">
                          <div className="buddy-avatar-wrapper" style={{ width: 44, height: 44 }}>
                            <span>{hostObj.full_name?.charAt(0)}</span>
                          </div>
                          <div className="buddy-info">
                            <h4 className="buddy-name" style={{ fontSize: 15 }}>
                              Kèo Connect từ <strong>{hostObj.full_name}</strong>
                            </h4>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                              🎯 Thẻ: <strong>{getTagName(room.child_code)}</strong> · 📍 Địa điểm: <strong>{room.location}</strong>
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`grant-direction-tag ${inv.status === 'accepted' ? 'grant-direction-tag--in' : 'grant-direction-tag--out'}`} style={{ background: inv.status === 'accepted' ? '#10B981' : inv.status === 'pending' ? '#F59E0B' : '#9CA3AF', color: '#fff' }}>
                              {inv.status === 'accepted' ? 'Đã Chấp Nhận' : inv.status === 'declined' ? 'Từ chối' : inv.status === 'pending' ? 'Đang Chờ' : 'Hết hạn'}
                            </span>
                          </div>
                        </div>

                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                          ⏰ Thời gian: <strong>{formatTime(room.scheduled_at)}</strong>
                        </div>

                        {/* Expired UX (PRD Section 8.2) */}
                        {isExpired ? (
                          <div className="expired-badge">
                            Rất tiếc, phòng hẹn đã đủ thành viên hoặc đã bị hủy. Hẹn bạn kèo sau nhé! 🍄
                          </div>
                        ) : (
                          inv.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 10, marginTop: 12, borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
                              <button
                                className="mushy-btn mushy-btn--primary mushy-btn--block"
                                onClick={() => handleAcceptInvitation(inv)}
                              >
                                Chấp nhận tham gia
                              </button>
                              <button
                                className="mushy-btn mushy-btn--ghost"
                                style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '10px 14px' }}
                                onClick={() => handleDeclineInvitation(inv)}
                              >
                                Từ chối
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          )}

        </>
      )}

      {/* PROFILE CONFIGURATION MODAL */}
      {showProfileModal && (
        <div className="modal-scrim dialog-scrim animated-fade-in" onClick={() => setShowProfileModal(false)}>
          <div className="modal-card" style={{ maxWidth: 500, textAlign: 'left', display: 'flex', flexDirection: 'column', maxHeight: '90dvh' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--hairline)', paddingBottom: 10 }}>
              <h3 className="dialog-title" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚙️</span> Thiết lập Hồ sơ Connect
              </h3>
              <button 
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: 'var(--muted)', padding: '0 4px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              <p className="mushy-section-sub" style={{ margin: '0 0 16px' }}>Điền các thông tin hành chính chéo và chọn tối đa 200 thẻ sở thích được thiết kế dạng Accordion thả xuống tiện lợi.</p>

              {/* Form fields */}
              <div style={{ marginBottom: 12 }}>
                <label className="mushy-label">Phòng ban trực thuộc (Department)</label>
                <input
                  type="text"
                  className="mushy-input"
                  placeholder="Vd: Kỹ thuật (R&D), Kinh doanh, Nhân sự..."
                  value={myProfile.department}
                  onChange={(e) => setMyProfile(prev => ({ ...prev, department: e.target.value }))}
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="mushy-label">Cơ sở làm việc (Facility)</label>
                <input
                  type="text"
                  className="mushy-input"
                  placeholder="Vd: Cơ sở Hà Nội - Keangnam, Cơ sở Landmark 81..."
                  value={myProfile.facility}
                  onChange={(e) => setMyProfile(prev => ({ ...prev, facility: e.target.value }))}
                  required
                />
              </div>

              {/* Available times multi-select */}
              <div style={{ marginBottom: 18 }}>
                <label className="mushy-label">Khung giờ rảnh thông thường (Multi-select)</label>
                <div className="chips-container" style={{ marginTop: 6 }}>
                  {['Giờ ăn trưa', 'Chiều sau giờ làm', 'Cuối tuần', 'Tối ngày thường'].map(time => {
                    const isSelected = myProfile.available_times.includes(time);
                    return (
                      <span
                        key={time}
                        className={`selectable-chip ${isSelected ? 'selectable-chip--selected' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            setMyProfile(prev => ({ ...prev, available_times: prev.available_times.filter(t => t !== time) }));
                          } else {
                            setMyProfile(prev => ({ ...prev, available_times: [...prev.available_times, time] }));
                          }
                        }}
                      >
                        ⏰ {time}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* SEARCH BAR LỌC NHANH */}
              <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 18, marginTop: 18 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Hệ thống thẻ sở thích (Tag Taxonomy - Accordion & Lọc Nhanh)</h4>
                <div className="search-box-container">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="mushy-input search-input"
                    placeholder="Gõ từ khóa để lọc nhanh 200 Child Tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* ACCORDION CATEGORY GRIDS */}
                <div style={{ marginTop: 12 }}>
                  {filteredAccordionTaxonomy.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>Không tìm thấy thẻ sở thích phù hợp.</p>
                  ) : (
                    filteredAccordionTaxonomy.map(parent => {
                      const isOpen = expandedParents[parent.parent_code] || parent.isAutoExpanded;
                      return (
                        <div key={parent.parent_code} className="accordion-item">
                          <div
                            className="accordion-header"
                            onClick={() => toggleParentAccordion(parent.parent_code)}
                          >
                            <span>{highlightSearchText(parent.parent_name, searchQuery)}</span>
                            <span className={`accordion-icon ${isOpen ? 'accordion-icon--open' : ''}`}>▼</span>
                          </div>

                          {isOpen && (
                            <div className="accordion-content">
                              <div className="chips-container">
                                {parent.children.map(c => {
                                  const isSelected = myTags.includes(c.code);
                                  return (
                                    <span
                                      key={c.code}
                                      className={`selectable-chip ${isSelected ? 'selectable-chip--selected' : ''}`}
                                      onClick={() => toggleSelectTag(c.code)}
                                    >
                                      {highlightSearchText(c.name, searchQuery)}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 14, marginTop: 14 }}>
              <button
                type="button"
                className="mushy-btn mushy-btn--primary mushy-btn--block"
                onClick={handleSaveProfile}
              >
                Lưu hồ sơ Connect 🍄
              </button>
              <button 
                type="button"
                className="mushy-btn mushy-btn--ghost mushy-btn--block" 
                onClick={() => setShowProfileModal(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOST CANCEL WITH REASONS MODAL (PRD Section 7.2) */}
      {showCancelModal && (
        <div className="modal-scrim dialog-scrim animated-fade-in" onClick={() => setShowCancelModal(null)}>
          <div className="modal-card dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon" style={{ background: 'rgba(230, 57, 70, 0.1)', color: 'var(--brand)' }}>
              🚨
            </div>
            <h3 className="dialog-title">Yêu cầu lý do hủy kèo</h3>
            <p className="dialog-body" style={{ textAlign: 'left', marginBottom: 12 }}>
              Hệ thống Connect bảo vệ văn hóa gắn kết văn minh. Vui lòng chọn hoặc nhập lý do để tự động gửi thông báo trang trọng tới nhóm chat trước khi đóng.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label className="mushy-label">Chọn lý do hủy phòng</label>
              <Select
                value={cancelReason}
                onChange={(val) => setCancelReason(val)}
                options={[
                  { value: 'Bận việc đột xuất', label: 'Bận việc đột xuất 💼' },
                  { value: 'Lý do thời tiết bất lợi', label: 'Lý do thời tiết bất lợi 🌧️' },
                  { value: 'Thay đổi kế hoạch tổ chức', label: 'Thay đổi kế hoạch tổ chức 🔄' },
                  { value: 'Không đủ số lượng thành viên tham gia mong muốn', label: 'Không đủ số lượng thành viên 👥' }
                ]}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="mushy-label">Lý do cụ thể khác (tùy chọn)</label>
              <textarea
                className="mushy-input"
                placeholder="Nhập lý do chi tiết..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="form-actions" style={{ display: 'flex', gap: 10 }}>
              <button className="mushy-btn mushy-btn--danger mushy-btn--block" onClick={handleCancelRoomSubmit}>
                Xác nhận Hủy phòng
              </button>
              <button className="mushy-btn mushy-btn--ghost mushy-btn--block" onClick={() => setShowCancelModal(null)}>
                Bỏ qua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CROSS-WORKSPACE SHARING MODAL */}
      {showSharingModal && (
        <div className="modal-scrim dialog-scrim animated-fade-in" onClick={() => setShowSharingModal(false)}>
          <div className="modal-card dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon" style={{ background: 'rgba(230, 57, 70, 0.1)', color: 'var(--brand)' }}>
              ⇆
            </div>
            <h3 className="dialog-title">Kết nối liên-Workspace</h3>
            <p className="dialog-body" style={{ textAlign: 'left', marginBottom: 16 }}>
              Tính năng chia sẻ chéo (superapp mig 049) cho phép thành viên giữa các workspace được liên kết xem thông tin và lập kèo chung cùng nhau!
            </p>

            <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 16, textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Nhập mã kết nối nhận chia sẻ</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="mushy-input"
                  placeholder="Nhập mã 6 ký tự..."
                  value={shareCodeInput}
                  onChange={(e) => setShareCodeInput(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                />
                <button className="mushy-btn mushy-btn--primary" style={{ padding: '0 16px', minHeight: 44 }} onClick={handleRedeemCode}>
                  Gửi
                </button>
              </div>
            </div>

            {isAnyAdmin && (
              <div style={{ borderTop: '1px solid var(--hairline)', marginTop: 18, paddingTop: 16, textAlign: 'left' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Tạo mã chia sẻ Workspace hiện tại</h4>
                <button className="mushy-btn mushy-btn--ghost mushy-btn--block" onClick={handleGenerateCode}>
                  Tạo Mã Kết Nối
                </button>

                {generatedCode && (
                  <div style={{ background: 'var(--surface-muted)', borderRadius: 12, padding: 12, marginTop: 10, textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--muted)' }}>Gửi mã này cho Workspace liên kết (Hạn 24h):</p>
                    <div style={{ fontSize: 24, fontWeight: 'bold', letterSpacing: 2, color: 'var(--brand)' }}>{generatedCode.code}</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--hairline)', marginTop: 18, paddingTop: 16, textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Các kết nối chia sẻ hiện tại</h4>
              {loadingGrants ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
                  <span className="mushy-spinner" />
                </div>
              ) : shareGrants.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, fontStyle: 'italic' }}>Chưa có kết nối chia sẻ chéo nào.</p>
              ) : (
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {shareGrants.map(grant => {
                    const isOwner = grant.direction === 'as_owner';
                    return (
                      <div key={grant.grantId} className="sharing-grant-row">
                        <div className="grant-info">
                          <span className={`grant-direction-tag ${isOwner ? 'grant-direction-tag--in' : 'grant-direction-tag--out'}`}>
                            {isOwner ? 'Phát chia sẻ' : 'Nhận chia sẻ'}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--ink)' }}>
                            {isOwner ? grant.followerWorkspaceName : grant.ownerWorkspaceName}
                          </span>
                        </div>
                        <button
                          className="mushy-btn mushy-btn--ghost"
                          style={{ padding: '4px 10px', minHeight: 30, fontSize: 11, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => handleRevokeGrant(grant.grantId)}
                        >
                          Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: 20 }}>
              <button className="mushy-btn mushy-btn--ghost mushy-btn--block" onClick={() => setShowSharingModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer" style={{ marginTop: 30, padding: '20px 0', borderTop: '1px solid var(--hairline)' }}>
        Mushy Connect 🍄 Made with <span className="heart" style={{ color: 'var(--brand)' }}>♥</span> for Internal Employee Engagement
      </footer>
    </div>
  );
}
