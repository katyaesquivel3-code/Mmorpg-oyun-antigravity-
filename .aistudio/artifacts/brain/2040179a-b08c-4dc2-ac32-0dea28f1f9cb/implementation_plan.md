# FAZ 3: DÜŞMANLAR VE İLK BOSS (TEPEGÖZ)

Ötüken açık dünyasına tam teşekküllü yapay zeka durum makinesi, 3 farklı düşman türü (Albız Ruhu, Kara Kış Gölgesi, Yek Kalkanlısı), grup koordinasyonlu saldırı slot sistemi, performans dostu chunk uyutma/canlanma döngüsü ve Altay dağ eteğinde 3 fazlı efsanevi Tepegöz boss karşılaşmasını entegre eden kapsamlı sistem tasarımı.

## User Review & Critical Decisions

> [!IMPORTANT]
> Kullanıcı yanıtları doğrultusunda kesinleşen temel tercihler ve varsayılanlar:

- **Confirmed Decision 1 (Boss Arenası Konumu)**: Tepegöz mağarası, Altay karlı dağ eteğinde (kuzeydoğu koordinatları x: 140, z: 140) açık mağara ağzı olarak yer alır; herhangi bir yükleme ekranı olmadan açık dünyadan kesintisiz (seamless) olarak girilir.
- **Confirmed Decision 2 (Düşman Dağılımı ve Yoğunluk)**: Düşmanlar biyomlara özgü kamplarda ve 3-4 kişilik devriye grupları halinde yerleştirilir. Çevredeki aktif chunk dışına çıkan düşmanlar dondurularak (culling) 60 FPS performansı korunur.
- **Confirmed Decision 3 (Boss Zorluğu ve Hata Payı)**: Adil ve dengeli aksiyon; Tepegöz'ün tüm ağır darbeleri 0.5 saniyelik belirgin telegraph (göz parlaması/toprak sarsıntısı) uyarısıyla gelir, oyuncu parry, roll veya Kut Zamanı ile tam karşılık verebilir.

---

## 1. Overview & Core Concept

- **What It Does**: Oyuncuya (Ayaz) yaşayan, tepki veren bir düşman ekosistemi sunar. Düşmanlar oyuncuyu görüş konisi (110°) ve adım/saldırı sesleri üzerinden algılar; grup halinde oyuncunun etrafını sarıp aynı anda en fazla 2 saldırı token'ı kullanarak taktiksel savaşır. Yek kalkanlıları sadece arkadan veya parry ile açılabilirken, Kara Kış gölgeleri uzaktan buz mermileri fırlatır, Albız ruhları ise hızlı hücumlar yapar. Karlı zirvelerin ardındaki mağarada ise devasa tek gözlü Tepegöz, 3 fazlı bir meydan okuma ve "Kut Parçası 1" ödülüyle bekler.
- **Target Audience / Persona**: Akıcı Zelda BotW / Souls-lite savaş mekaniklerini, mitolojik Türk anlatısını ve refleks odaklı dövüş dinamiklerini seven oyuncular.
- **Key Value**: Yalnızca kuklalara vurulan prototip aşamasından, gerçek tehlike arz eden, loot düşüren, müzik modunu değiştiren ve tepe noktası olan bir boss savaşıyla taçlanan eksiksiz bir macera döngüsüne geçiş.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Dünyada Keşif ve Fark Edilme**:
   - Oyuncu Yer-Sub ormanında veya göl kıyısında dolaşırken düşman devriyesine yaklaşır.
   - Düşman başı üstünde 3D sarı ünlem (Alert) belirir, düşman savaş pozisyonu alır.
   - Savaş müziği hook'u tetiklenir (`CombatMusicEvents.triggerCombatBgm()`).
2. **Taktiksel Çatışma ve Grup Koordinasyonu**:
   - 3-4 düşmandan en fazla 2'si saldırı token'ı alarak `TELEGRAPH` (kırmızı/turuncu parıltı) evresine girer.
   - Diğer düşmanlar oyuncunun çevresini sararak (orbit/surround) mesafeyi korur.
   - Oyuncu parry yaparak Yek'in kalkanını düşürür, Kut Zamanı ile zamanı yavaşlatıp Albız sürüsünü biçer.
3. **Ganimet Toplama**:
   - Ölen düşmandan 3D dönen meyve ve kut tozu saçılır (Can Meyvesi: +25 HP, Kut Tozu: +35 Soluk).
4. **Tepegöz Mağarasına Giriş ve Boss Savaşı**:
   - Oyuncu Altay dağ eteğindeki dev mağara ağzına girer. Mağara sütunları ve loş mavi-kızıl ışıklar atmosferi değiştirir.
   - Eşik geçilince Boss Müziği devreye girer, ekranın üstünde DOM tabanlı Tepegöz Can Barı belirir:
     - **Faz 1 (%100 - %70 Can)**: Devasa yumruk savurma ve 2 elli yere vurma (şok dalgası).
     - **Faz 2 (%70 - %30 Can)**: Kısa sinematik sarsıntı; Tepegöz mağara kayalarını koparıp fırlatır, serbest eliyle tek gözünü siper eder.
     - **Faz 3 (%30 - %0 Can)**: Öfke modu! Gövdesi kızıllaşır, hızı artar. Gözünü açtığı an yay ile vurulduğunda devasa stagger (yere çökme) yaşar ve kritik hasar alır.
5. **Zafer ve Kut Parçası**:
   - Tepegöz mağara zeminine yığılır, mağara merkezinde göğe uzanan ilahi altın ışık huzmesi (Kut Parçası 1) yükselir.

### Visual Identity & Theme
- **Color Palette & Aura**:
  - *Albız Ruhu*: Eterik soluk mor-lacivert sis aura, parıldayan mavi çekirdek.
  - *Kara Kış Gölgesi*: Buz mavisi ve dondurucu siyah kristaller, soğuk beyaz buz mermileri.
  - *Yek Muhafızı*: Ham demir zırh, ahşap-bronz oval kalkan, kırmızı göz yuvaları.
  - *Tepegöz*: Kadim kaya-et dokusu, bronz bileklikler, devasa kan çanağı tek göz (açıkken altın-sarı zayıf nokta ışığı).
  - *Kut Parçası*: Yüksek kontrastlı kutsal altın-beyaz güneş sütunu.
- **HUD & DOM Arayüzü**:
  - Ekran üstünde altın çerçeveli, kırmızı-dolgu Boss Barı (`#bossHpBar`), altında faz simgesi (`#bossPhaseIndicator`).
  - Dinamik 3D hasar sayıları (kritik göz vuruşlarında altın sarısı büyük rakamlar).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Tekilleştirilmiş CombatTarget Arayüzü (Universal Target System)**
  - *Chosen Approach*: `TrainingDummy`, `EnemyAI` türevleri ve `TepegozBoss` nesnelerinin hepsi ortak bir `CombatTarget` kontratına uyar (`takeHit`, `applyParryStagger`, `getLockOnPosition`, `isTelegraphing`, `isStriking`).
  - *Why*: Mevcut `CombatSystem`, kılıç vuruş testleri, ok balistiği (`ArrowSystem`) ve kilitlenme kamerası (`CameraRig`) hiçbir karmaşa olmadan tüm düşmanlarla ve boss ile anında uyumlu çalışır.
- **Decision 2: Token-Tabanlı Grup Koordinasyonu (Max 2 Attackers)**
  - *Chosen Approach*: `EnemyManager` bünyesinde 2 adet aktif saldırı token'ı tutulur. Düşman yalnızca token boştaysa `TELEGRAPH` -> `ATTACK` evresine geçebilir; aksi halde oyuncunun çevresinde 3.5 - 6m mesafede daire çizer (`SURROUND`).
  - *Why*: Çoklu düşman savaşlarında oyuncunun sürekli arkadan aynı anda 4 darbe alıp sersemletilmesini (stun-lock) önler, dövüşe sinematik ve adil bir ritim kazandırır.
- **Decision 3: Chunk-Tabanlı Uyutma / Canlanma (Culling & Pooling)**
  - *Chosen Approach*: Oyuncudan 90 metreden uzakta kalan veya inaktif chunk'lardaki düşmanların yapay zeka güncellemesi ve mesh transform hesaplamaları durdurulur (`sleep()`).
  - *Why*: Mobil WebGL ortamında 50+ düşman olsa dahi işlemci yükünü 0'a indirir, 60 FPS garantilenir.
- **Decision 4: DynamicTexture ve Babylon GUI Yasağına Tam Sadakat**
  - *Chosen Approach*: Boss can barı tamamen şık, GPU donanımlı CSS/DOM katmanında (`index.html` + `HUD.ts`) çizilir. Canavarların telegraph efektleri shader emissive renk çarpımıyla ve 3D parçacıklarla verilir.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              GAME LOOP                                 │
│                              (main.ts)                                 │
└───────┬────────────────────────────┬────────────────────────────┬──────┘
        │                            │                            │
        ▼                            ▼                            ▼
┌─────────────────┐        ┌──────────────────┐         ┌────────────────┐
│  PlayerController│◄───────┤   CombatSystem   ├────────►│   CameraRig    │
│  & AyazModel    │        │  (Kut, Parry,    │         │  (Lock-on,     │
└─────────────────┘        │   Arrows, Combos)│         │   Trauma, Boss)│
                           └────────┬─────────┘         └────────────────┘
                                    │
                                    ▼ CombatTarget Interface
┌────────────────────────────────────────────────────────────────────────┐
│                              EnemyManager                              │
│ ┌─────────────────────────┐  ┌───────────────────────────────────────┐ │
│ │ Attack Token Controller │  │ Chunk Distance Culling (Sleep/Wake)   │ │
│ │ (Max 2 Sim. Attackers)  │  │ Loot Spawner (Can Meyvesi, Kut Tozu)  │ │
│ └────────────┬────────────┘  └───────────────────┬───────────────────┘ │
│              │                                   │                     │
│              ▼                                   ▼                     │
│     ┌─────────────────┐                 ┌─────────────────┐            │
│     │     EnemyAI     │                 │   LootPickup    │            │
│     │  (State Machine)│                 │  (HP & Stamina) │            │
│     └────────┬────────┘                 └─────────────────┘            │
│              │                                                         │
│     ┌────────┴───────────────────────────┐                             │
│     ▼                         ▼          ▼                             │
│ ┌──────────────┐     ┌──────────────┐ ┌──────────────┐                 │
│ │ Albız Ruhu   │     │Kara Kış Gölg.│ │ Yek Muhafızı │                 │
│ │ (Hızlı Sürü) │     │(Buz Atıcı)   │ │ (Kalkan/Parry│                 │
│ └──────────────┘     └──────────────┘ └──────────────┘                 │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        TepegozBoss & CaveArena                         │
│ ┌──────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ │
│ │ Phase 1: Yumruk/Ezme │ │ Phase 2: Taş Atma  │ │ Phase 3: Öfke/Zayıf│ │
│ │ (Şok Dalgası)        │ │ & Göz Siperi       │ │ Nokta Göz Atışı    │ │
│ └──────────────────────┘ └────────────────────┘ └────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ DOM Boss Bar (#bossHpBar) + Kut Parçası 1 Işık Huzmesi Ödülü       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Proposed Modules to Implement
1. `/src/combat/CombatTarget.ts`: Ortak hedefleme, hasar alma, parry ve telegraph arayüzü.
2. `/src/enemy/EnemyAI.ts`: Temel durum makinesi (`IDLE`, `PATROL`, `ALERT`, `SURROUND`, `TELEGRAPH`, `ATTACK`, `STAGGER`, `DEATH`), görüş açısı (110°), ayak sesi algısı, animasyon interpolatörü.
3. `/src/enemy/AlbizSpirit.ts`: Hızlı, alçaktan uçan gölge ruhu modeli ve sürü atılma saldırısı.
4. `/src/enemy/KarakisShadow.ts`: Sivri buz pelerinli gölge büyücüsü ve yönelen buz mermisi (`IceProjectile.ts`).
5. `/src/enemy/YekWarrior.ts`: Demir zırhlı kalkanlı er; önden %100 blok, arkadan ve parry sonrası sersemleme.
6. `/src/enemy/LootSystem.ts`: 3D dönen meyve ve kut tozu modelleri, oyuncu yaklaşınca süzülerek toplanma ve efekt.
7. `/src/enemy/EnemyManager.ts`: Chunk tabanlı doğma, token koordinasyonu (en fazla 2 eşzamanlı saldırgan), uyutma/culling.
8. `/src/boss/CaveArena.ts`: Altay eteğinde açık mağara içi tünel ve kubbe geometrisi, kırılabilir sütunlar.
9. `/src/boss/TepegozBoss.ts`: 3 fazlı devasa tepegöz modeli, yumruk/şok dalgası, kaya fırlatma, göz açılma zayıf noktası, sinematik kamera ve Kut Parçası 1 ödülü.
10. `/src/audio/CombatMusicEvents.ts`: Savaş durumu ve boss karşılaşması için olay yayınlama mekanizması (Faz 5 ses motoruna hazır).
11. `/src/ui/HUD.ts` & `/index.html`: DOM Boss Bar bileşenleri ve stil tanımları.

---

## 5. Verification Plan

### Automated Build Verification
- Tüm yeni TypeScript dosyaları ve güncellenen modüller yazıldıktan sonra `compile_applet` ile TypeScript derlemesi doğrulanacak.
- Hiçbir derleme uyarısı veya eksik modül/import bırakılmayacak.

### Gameplay & CUJ Verification
1. **Düşman Yapay Zekası Testi**:
   - Oyuncu düşmana yaklaştığında sarı Alert reaksiyonu ve kuşatma (surround) hareketi.
   - En fazla 2 düşmanın aynı anda kırmızı telegraph ile saldırması.
   - Yek'in kalkanının parry ile kırılması ve arkadan vuruş hassasiyeti.
2. **Kut Zamanı & Kombo Entegrasyonu**:
   - Düşman saldırırken yapılan son an kaçışının (0.15 sn) Kut Zamanı yavaş çekimini açması.
3. **Loot Döngüsü**:
   - Düşman öldüğünde Can Meyvesi ve Kut Tozu düşmesi, oyuncu üzerinden geçince can/soluk barlarının dolması.
4. **Tepegöz Boss Karşılaşması**:
   - Mağaraya girildiğinde DOM Boss Bar'ın belirmesi ve Boss tema olayının tetiklenmesi.
   - Faz 1 (yumruk), Faz 2 (kaya fırlatma), Faz 3 (öfke modu ve gözün okla vurulması).
   - Boss öldüğünde sinematik çöküş ve Kut Parçası 1 altın sütununun yükselmesi.
