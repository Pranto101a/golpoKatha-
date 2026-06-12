# গল্পকথা — সংখ্যা যুদ্ধ (Golpokotha)

বাংলা মাল্টিপ্লেয়ার কার্ড গেম। অফলাইন (পাস-এন্ড-প্লে + বট) এবং অনলাইন (Socket.io রুম)।

## 📦 ফাইল
- `index.html` — সম্পূর্ণ ক্লায়েন্ট (UI, VFX, অফলাইন গেম, Smart Bot)
- `server.js` — অনলাইন Socket.io সার্ভার
- `package.json` — সার্ভার dependencies
- `bg.jpeg` — ব্যাকগ্রাউন্ড

## 🎴 নিয়ম (সংক্ষেপে)
- কার্ড পয়েন্ট: জোড় কার্ডে {2,4,6,7,10,15,20} — সর্বোচ্চ ২০
- প্রতি প্লেয়ারে কার্ড: ৫–১৫ (dropdown)
- প্লেয়ার: ২–১০ জন (বট + রিয়েল মিলিয়ে)
- প্রথম রাউন্ড: শুধু কার্ড → পয়েন্ট সংগ্রহ (বিড নেই)
- প্রথম চাল: যার কাছে corner=৫ কার্ড
- ২য় রাউন্ড থেকে: **পয়েন্ট-বিড (০–৫০)**
  - বিড হিট (collected ≥ bid): `+bid + collected পয়েন্ট`
  - বিড মিস (collected < bid): `−bid পয়েন্ট`
- লাইভ স্কোর বোর্ড: প্রত্যেকের তোলা পয়েন্ট + ট্রিক রিয়েল টাইমে দেখা যায়
- ট্রিক জিতলে পপআপ (Continue চাপলে এগোয়)
- টিম মোড: Solo / 2v2 / 3v3 / 4v4 / 5v5

## ▶ অফলাইনে চালানো (এক ফোনে)
শুধু `index.html` ব্রাউজারে খুলুন → "বট ও পাস-এন্ড-প্লে" → সেটআপে মোট প্লেয়ার + বট বেছে নিন।

## 🌐 লোকালি Socket.io সার্ভার চালানো
```bash
cd public/game
npm install
npm start            # http://localhost:3000
```

---

# 🚀 GitHub + Render এ Deploy (অনলাইন মাল্টিপ্লেয়ার)

## ১) GitHub এ কোড আপলোড
1. https://github.com এ লগ-ইন করুন → **New repository** → নাম দিন (যেমন `golpokotha`) → Public/Private বেছে নিন → Create।
2. কম্পিউটারে এই project ফোল্ডার আনপ্যাক করুন।
3. টার্মিনালে:
   ```bash
   cd golpokotha          # যেখানে index.html, server.js আছে
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/<আপনার-user>/golpokotha.git
   git push -u origin main
   ```
   *(অথবা GitHub Desktop দিয়ে drag-and-drop করতে পারেন)*

## ২) Render এ Deploy
1. https://render.com এ Sign up (GitHub দিয়ে লগ-ইন করলে সহজ)।
2. Dashboard → **New +** → **Web Service** → আপনার GitHub repo বেছে নিন।
3. সেটিংস:
   - **Name**: `golpokotha` (বা ইচ্ছামতো)
   - **Region**: Singapore বা সবচেয়ে কাছেরটি
   - **Branch**: `main`
   - **Root Directory**: ফাঁকা (যদি ফাইলগুলো repo-র root এ থাকে) **অথবা** `public/game` (যদি Lovable export এর মতো subfolder এ থাকে)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
4. **Create Web Service** চাপুন → ১-৩ মিনিট wait → Render একটি URL দিবে যেমন:
   `https://golpokotha.onrender.com`

## ৩) খেলা
- উপরের URL ব্রাউজারে খুলুন।
- **অনলাইন মাল্টিপ্লেয়ার → রুম ক্রিয়েট করুন** চাপলে ৪-অক্ষরের কোড আসবে (যেমন `K7QM`)।
- বন্ধুদের সেই URL + কোড পাঠান → তারা **রুমে যোগ দিন** এ কোডটি দিবে।
- সবাই ঢোকার পর host **গেম শুরু** চাপবে।

### ⚠️ Free tier-এর সীমা
- Render free service ১৫ মিনিট inactivity-র পর ঘুমায়, প্রথম request এ ~৩০ সেকেন্ড লাগে। ছোট গেমের জন্য সমস্যা না।

## ৪) আপডেট পাঠানো
ভবিষ্যতে কোড বদলালে:
```bash
git add .
git commit -m "update"
git push
```
Render স্বয়ংক্রিয়ভাবে redeploy করবে।

---

## ✨ ফিচার
- 🎨 ম্যাজিক্যাল ফ্যান্টাসি ব্যাকগ্রাউন্ড + স্পার্কল
- 🌈 অ্যানিমেটেড "গল্পকথা" টাইটেল
- 🔊 সাউন্ড ইফেক্ট
- 🤖 Smart Bot (বিড + কার্ড স্ট্র্যাটেজি)
- 📱 পাস-এন্ড-প্লে phone-handoff overlay
- 📊 লাইভ স্কোর + ট্রিক রিক্যাপ
- 🌐 অনলাইন রুম (Create / Join)
