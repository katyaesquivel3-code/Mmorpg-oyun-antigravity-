/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Görev Veri Modeli ve Bütüncül Görev Listesi (QuestData)
 * (6 Ana Görev, 4 Yan Görev, 6 Hedef Türü, Işık Sütunu Pozisyonları & Zincirler)
 */

export type ObjectiveType = 'GOTO' | 'KILL' | 'COLLECT' | 'TALK' | 'DISCOVER' | 'PROTECT' | 'INTERACT';
export type QuestType = 'MAIN' | 'SIDE';
export type QuestState = 'LOCKED' | 'ACTIVE' | 'OBJECTIVE_MET' | 'COMPLETED';

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  descriptionTr: string;
  currentCount: number;
  targetCount: number;
  targetCoords?: { x: number; y: number; z: number };
  isDone: boolean;
}

export interface QuestDefinition {
  id: string;
  titleTr: string;
  type: QuestType;
  chapterTr: string;
  descriptionTr: string;
  objectives: QuestObjective[];
  rewardTr: string;
  state: QuestState;
  nextQuestId?: string;
  beaconPos?: { x: number; y: number; z: number };
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  // ================= 6 ANA GÖREV (YER-SUB ORMANI) =================
  {
    id: 'quest_kul_olan_oba',
    titleTr: '1. Kül Olan Oba',
    type: 'MAIN',
    chapterTr: 'Bölüm I: Duman ve Kül',
    descriptionTr: 'Erlik körmözlerinin baskını sonrası yanan Ötüken Obası’ndaki 3 yaralı göçebeye yardım et ve Kam Ata’nın düşen kutsal kemerini bul.',
    objectives: [
      {
        id: 'obj_kul_yaralilar',
        type: 'COLLECT',
        descriptionTr: 'Yaralı oba halkına yardım et ve kutsal kemeri topla',
        currentCount: 0,
        targetCount: 2,
        targetCoords: { x: 5, y: 1.2, z: 10 },
        isDone: false
      },
      {
        id: 'obj_kul_talk_korkut',
        type: 'TALK',
        descriptionTr: 'Ulu Kam Korkut Ata ile konuş ve emaneti teslim et',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -2.5, y: 1.5, z: 18.0 },
        isDone: false
      }
    ],
    rewardTr: 'Oba İlk Onarımı & Börü Koku İzi Eğitimi',
    state: 'ACTIVE',
    nextQuestId: 'quest_borunun_izi',
    beaconPos: { x: -2.5, y: 1.5, z: 18.0 }
  },

  {
    id: 'quest_borunun_izi',
    titleTr: '2. Börü’nün İzi',
    type: 'MAIN',
    chapterTr: 'Bölüm I: Duman ve Kül',
    descriptionTr: 'Börü’nün koku izini sürerek güneybatıdaki ardıç koruluğuna git ve çalınan kutsal Sedir Kopuzu’nu körmözlerden kurtar.',
    objectives: [
      {
        id: 'obj_boru_sniff',
        type: 'GOTO',
        descriptionTr: 'Börü’nün "Kokla" koku parçacık izini güney koruluğuna kadar takip et',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -35, y: 2.5, z: -45 },
        isDone: false
      },
      {
        id: 'obj_kopuz_turnin',
        type: 'TALK',
        descriptionTr: 'Sedir Kopuzu’nu Ozan Toygun’a teslim et',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 4.0, y: 1.2, z: -16.0 },
        isDone: false
      }
    ],
    rewardTr: 'Gök Kopuz Ezgisi & Börü Isırma Saldırısı',
    state: 'LOCKED',
    nextQuestId: 'quest_avcinin_sirri',
    beaconPos: { x: -35, y: 2.5, z: -45 }
  },

  {
    id: 'quest_avcinin_sirri',
    titleTr: '3. Avcının Sırrı',
    type: 'MAIN',
    chapterTr: 'Bölüm II: Bozkırın Kanunları',
    descriptionTr: 'Avcı Günçiçek’ten yay ve gizlilik dersi al, bozkır otlarında gizlenerek şafakta maral avla ve etini oba ocağına getir.',
    objectives: [
      {
        id: 'obj_avci_maral',
        type: 'KILL',
        descriptionTr: 'Bozkırda 1 maral avla ve etini topla',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -60, y: 3.0, z: -20 },
        isDone: false
      },
      {
        id: 'obj_avci_turnin',
        type: 'TALK',
        descriptionTr: 'Av etiyle Günçiçek’in yanına dön',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -12.0, y: 1.2, z: -10.0 },
        isDone: false
      }
    ],
    rewardTr: 'Genişletilmiş Sadak (45 Ok) & Gizlilik Pelerini',
    state: 'LOCKED',
    nextQuestId: 'quest_demircinin_borcu',
    beaconPos: { x: -12.0, y: 1.2, z: -10.0 }
  },

  {
    id: 'quest_demircinin_borcu',
    titleTr: '4. Demircinin Borcu',
    type: 'MAIN',
    chapterTr: 'Bölüm II: Bozkırın Kanunları',
    descriptionTr: 'Demirci Bamsı için doğudaki Gölge Boğazı körmöz karakolunu bas, Kara Totem’i yık ve 5 demir cevheri getir.',
    objectives: [
      {
        id: 'obj_demirci_totem',
        type: 'KILL',
        descriptionTr: 'Gölge Boğazı Kara Totem’ini parçala ve 5 demir cevheri topla',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -75, y: 5.0, z: 80 },
        isDone: false
      },
      {
        id: 'obj_demirci_turnin',
        type: 'TALK',
        descriptionTr: 'Cevherleri Demirci Bamsı’ya götür',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 14.0, y: 1.2, z: -8.0 },
        isDone: false
      }
    ],
    rewardTr: 'Kam Kılıcı Namlu Bilemesi (+10 Keskinlik Hasarı)',
    state: 'LOCKED',
    nextQuestId: 'quest_bay_terek_fisilti',
    beaconPos: { x: -75, y: 5.0, z: 80 }
  },

  {
    id: 'quest_bay_terek_fisilti',
    titleTr: '5. Bay Terek’in Fısıltısı',
    type: 'MAIN',
    chapterTr: 'Bölüm III: Kut’un Dört Parçası',
    descriptionTr: 'Ulu Hayat Ağacı Bay Terek’in köklerine çık, Gök Tengri’nin vizyonunu gör ve Kut’un dört ulu parçasının sırrını çöz.',
    objectives: [
      {
        id: 'obj_bay_terek_vizyon',
        type: 'DISCOVER',
        descriptionTr: 'Bay Terek’in kökündeki kutsal sunağa dokun ve vizyonu izle',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 0, y: 4.5, z: 28 },
        isDone: false
      },
      {
        id: 'obj_bay_terek_talk',
        type: 'TALK',
        descriptionTr: 'Gördüklerini Ulu Kam Korkut Ata’ya aktar',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -2.5, y: 1.5, z: 18.0 },
        isDone: false
      }
    ],
    rewardTr: 'Tengri Perdesi Görüsü & Tepegöz İni Giriş İzni',
    state: 'LOCKED',
    nextQuestId: 'quest_yersubun_kalbi',
    beaconPos: { x: 0, y: 4.5, z: 28 }
  },

  {
    id: 'quest_yersubun_kalbi',
    titleTr: '6. Yer-Sub’un Kalbi',
    type: 'MAIN',
    chapterTr: 'Bölüm IV: Baş Düşman Tepegöz',
    descriptionTr: 'Güney mağara amfiteatrına in, tek gözlü dev Tepegöz’ü Basat taktiğiyle gözünden vurarak devir ve Yer Kutu relikini al.',
    objectives: [
      {
        id: 'obj_tepegoz_defeat',
        type: 'KILL',
        descriptionTr: 'Tepegöz’ü alt et ve kutsal Yer Kutu’nu Bay Terek’e taşı',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 0, y: 2.0, z: -135 },
        isDone: false
      },
      {
        id: 'obj_tepegoz_finish',
        type: 'TALK',
        descriptionTr: 'Kam Ata ile konuş, Ateş Gücünü al ve Ergenekon’a hazırlan',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -2.5, y: 1.5, z: 18.0 },
        isDone: false
      }
    ],
    rewardTr: 'Bay Terek 1. Kat Yeşermesi & Ateş Temrenleri (Ergenekon Kilidi Açılır)',
    state: 'LOCKED',
    beaconPos: { x: 0, y: 2.0, z: -135 }
  },

  // ================= 4 YAN GÖREV =================
  {
    id: 'quest_balballar',
    titleTr: 'Kadim Balbal Taşları',
    type: 'SIDE',
    chapterTr: 'Bozkırın Gizemleri',
    descriptionTr: 'Yer-Sub açık dünyasına dikilmiş 6 kadim Türk alp balbalını ziyaret ederek ataların ruhunu selamla.',
    objectives: [
      {
        id: 'obj_balbal_count',
        type: 'DISCOVER',
        descriptionTr: '6 Balbal taşını bul ve dua et',
        currentCount: 0,
        targetCount: 6,
        isDone: false
      }
    ],
    rewardTr: '+15 Maksimum Soluk (Stamina)',
    state: 'ACTIVE'
  },

  {
    id: 'quest_kurganlar',
    titleTr: '3 Kurgan Hazinesi',
    type: 'SIDE',
    chapterTr: 'Bozkırın Gizemleri',
    descriptionTr: 'Orman ve dağ eteklerindeki 3 kutsal kurgan höyüğünü keşfet, antik sandıkları aç.',
    objectives: [
      {
        id: 'obj_kurgan_count',
        type: 'DISCOVER',
        descriptionTr: '3 Kurgan hazinesini yağmacılardan kurtar',
        currentCount: 0,
        targetCount: 3,
        isDone: false
      }
    ],
    rewardTr: 'Altın Cevherler & Kut Tozu',
    state: 'ACTIVE'
  },

  {
    id: 'quest_kayip_cocuk',
    titleTr: 'Kayıp Çocuk Alpagut',
    type: 'SIDE',
    chapterTr: 'Obanın Yaraları',
    descriptionTr: 'Baskın sırasında güneybatı ardıçlığına kaçan küçük Alpagut’u Börü’nün burnu ve koku iziyle bulup anasına kavuştur.',
    objectives: [
      {
        id: 'obj_child_find',
        type: 'GOTO',
        descriptionTr: 'Börü’nün kokusunu sürerek kayıp çocuğu bul',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -48, y: 2.2, z: -55 },
        isDone: false
      },
      {
        id: 'obj_child_mother',
        type: 'TALK',
        descriptionTr: 'Çocuğu obadaki ağlayan anasına teslim et',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 8, y: 1.2, z: 5 },
        isDone: false
      }
    ],
    rewardTr: 'Mavi Şifa Kemeri (+25 Maksimum Can)',
    state: 'LOCKED',
    beaconPos: { x: -48, y: 2.2, z: -55 }
  },

  {
    id: 'quest_ocagin_kulu',
    titleTr: 'Ocağın Külü',
    type: 'SIDE',
    chapterTr: 'Obanın Yeniden Doğuşu',
    descriptionTr: 'Tepegöz zaferinden sonra kazandığın Ateş gücüyle Ötüken Obası’nın sönmüş ortak ocağını alevlendir.',
    objectives: [
      {
        id: 'obj_fire_light',
        type: 'GOTO',
        descriptionTr: 'Oba ocağına yaklaş ve kutsal ateşi yak',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 0, y: 1.0, z: 0 },
        isDone: false
      }
    ],
    rewardTr: 'Sürekli Dinlenme Şifası & Ritmik Şaman Davulları',
    state: 'LOCKED',
    beaconPos: { x: 0, y: 1.0, z: 0 }
  },

  // ================= FAZ 9: ERGENEKON & DEMİR DAĞ GÖREVLERİ =================
  {
    id: 'quest_ergenekon_destani',
    titleTr: 'Ergenekon Destanı',
    type: 'MAIN',
    chapterTr: 'Bölüm II: Demir Dağ ve Ergenekon',
    descriptionTr: 'Asena rehberliğinde Demir Dağ geçidini aş, Baş Demirci Kızıl Usta ile 7 körük ocağını harlayarak demir kapıyı erit ve Erlik Han’ın devi Demir Dağ Bekçisi’ni yenerek ATEŞ KUTU’nu kurtar.',
    objectives: [
      {
        id: 'obj_ergenekon_enter',
        type: 'GOTO',
        descriptionTr: 'Ergenekon Vadisi’ne gir ve Baş Demirci Kızıl Usta ile konuş',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 82, y: 4.8, z: 6 },
        isDone: false
      },
      {
        id: 'obj_ergenekon_melt',
        type: 'GOTO',
        descriptionTr: '7 Körük Ocağını körükleyip demir dağı erit',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 105, y: 5.0, z: 12 },
        isDone: false
      },
      {
        id: 'obj_ergenekon_boss',
        type: 'KILL',
        descriptionTr: 'Demir Dağ Bekçisi devini mağlup et ve ATEŞ KUTU’nu al',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 160, y: 7.5, z: 35 },
        isDone: false
      }
    ],
    rewardTr: 'ATEŞ KUTU & Efsanevi TULPAR Bineği',
    state: 'ACTIVE',
    beaconPos: { x: 82, y: 4.8, z: 6 }
  },

  {
    id: 'quest_ciragin_korugu',
    titleTr: 'Çırağın Körüğü',
    type: 'SIDE',
    chapterTr: 'Ergenekon Vadisi',
    descriptionTr: 'Kızıl Usta’nın genç çırağının lav nehrinin ötesine düşürdüğü antik bronz körük vanasını bul ve geri getir.',
    objectives: [
      {
        id: 'obj_cirak_find_valve',
        type: 'COLLECT',
        descriptionTr: 'Lav kıyısındaki bronz körük vanasını al',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 125, y: 3.5, z: -15 },
        isDone: false
      },
      {
        id: 'obj_cirak_return',
        type: 'TALK',
        descriptionTr: 'Vanayı Kızıl Usta’ya teslim et',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 82, y: 4.8, z: 6 },
        isDone: false
      }
    ],
    rewardTr: 'Naneli Ayran (Ateş Direnci) & Demir Dağ Kalkanı',
    state: 'LOCKED',
    beaconPos: { x: 125, y: 3.5, z: -15 }
  },

  {
    id: 'quest_erimeyen_kilic',
    titleTr: 'Erimeyen Kılıç',
    type: 'SIDE',
    chapterTr: 'Ergenekon Vadisi',
    descriptionTr: 'Ergenekon madenindeki 3 saf demir cevheri damarından cevher topla ve Kızıl Usta’nın örsünde kadim kılıcı döv.',
    objectives: [
      {
        id: 'obj_iron_mine',
        type: 'COLLECT',
        descriptionTr: '3 adet saf demir cevheri damarını kaz',
        currentCount: 0,
        targetCount: 3,
        targetCoords: { x: 95, y: 4.5, z: 10 },
        isDone: false
      },
      {
        id: 'obj_iron_forge',
        type: 'TALK',
        descriptionTr: 'Kızıl Usta’nın örsünde Erimeyen Kılıcı döv',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 82, y: 4.8, z: 6 },
        isDone: false
      }
    ],
    rewardTr: 'Demir Dağ Kılıcı (Seviye 3) & 20 Kut Tozu',
    state: 'LOCKED',
    beaconPos: { x: 95, y: 4.5, z: 10 }
  },

  // ================= FAZ 10: ŞAHMARAN GÖLÜ (SU KUTU) =================
  {
    id: 'quest_sahmaran_destani',
    titleTr: 'Şahmaran Destanı',
    type: 'MAIN',
    chapterTr: 'Bölüm IV: Zehirli Sular ve Su İyesi',
    descriptionTr: 'Erlik Han körmözlerinin zehirlediği kutsal Şahmaran Gölü’nün derinliklerindeki batık tapınağa dal, 3 antik pınar vanasını açarak suyu arındır ve Şahmaran’ı kurtararak SU KUTU’nu kazan.',
    objectives: [
      {
        id: 'obj_sahmaran_talk_lokman',
        type: 'TALK',
        descriptionTr: 'Göl kıyısındaki Bilge Lokman Hekim ile konuş',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -80, y: 1.5, z: -35 },
        isDone: false
      },
      {
        id: 'obj_sahmaran_purify_springs',
        type: 'COLLECT',
        descriptionTr: 'Göl çevresindeki 3 antik arıtıcı pınar vanasını aç',
        currentCount: 0,
        targetCount: 3,
        targetCoords: { x: -130, y: 0.0, z: -40 },
        isDone: false
      },
      {
        id: 'obj_sahmaran_boss_defeat',
        type: 'KILL',
        descriptionTr: 'Batık tapınak tabanında Şahmaran / Kara Su Devini alt et ve SU KUTU’nu al',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -130, y: -12.0, z: -45 },
        isDone: false
      }
    ],
    rewardTr: 'SU KUTU (Sınırsız Nefes & Su Şifası) & 40 Kut Tozu',
    state: 'ACTIVE',
    beaconPos: { x: -80, y: 1.5, z: -35 }
  },

  {
    id: 'quest_lokman_sifa_otu',
    titleTr: "Lokman'ın Şifa Otu",
    type: 'SIDE',
    chapterTr: 'Şahmaran Gölü',
    descriptionTr: 'Lokman Hekim’in zehre karşı yapacağı panzehir için göldeki yüzen nilüfer adalarından 3 adet Kutsal Nilüfer Çiçeği topla.',
    objectives: [
      {
        id: 'obj_lotus_gather',
        type: 'COLLECT',
        descriptionTr: 'Nilüfer adalarından 3 kutsal nilüfer çiçeği topla',
        currentCount: 0,
        targetCount: 3,
        targetCoords: { x: -140, y: 0.5, z: 25 },
        isDone: false
      },
      {
        id: 'obj_lotus_turnin',
        type: 'TALK',
        descriptionTr: 'Çiçekleri Lokman Hekim’e teslim et',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -80, y: 1.5, z: -35 },
        isDone: false
      }
    ],
    rewardTr: 'Panzehir İksiri Tarifi & 25 Kut Tozu',
    state: 'LOCKED',
    beaconPos: { x: -140, y: 0.5, z: 25 }
  },

  {
    id: 'quest_zehirli_pinarlar',
    titleTr: 'Zehirli Pınarlar',
    type: 'SIDE',
    chapterTr: 'Şahmaran Gölü',
    descriptionTr: 'Göl havzasına sızan Erlik körmözlerinin ele geçirdiği 3 zehirli kaynağı temizle ve amfibik Su Yek bekçilerini alt et.',
    objectives: [
      {
        id: 'obj_clear_spring_guardians',
        type: 'KILL',
        descriptionTr: 'Pınarları koruyan 3 Su Yek savaşçısını alt et',
        currentCount: 0,
        targetCount: 3,
        targetCoords: { x: -110, y: 1.0, z: -60 },
        isDone: false
      },
      {
        id: 'obj_spring_turnin',
        type: 'TALK',
        descriptionTr: 'Lokman Hekim’e kaynakların arındığını bildir',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -80, y: 1.5, z: -35 },
        isDone: false
      }
    ],
    rewardTr: 'Su Yek Mızrağı & 30 Kut Tozu',
    state: 'LOCKED',
    beaconPos: { x: -110, y: 1.0, z: -60 }
  },

  {
    id: 'quest_sahmaran_sinavi',
    titleTr: "Şahmaran'ın Sınavı (Zehir ve Şifa)",
    type: 'MAIN',
    chapterTr: 'Şahmaran Gölü',
    descriptionTr: 'Bilge Şahmaran’ın güvenini kazanmak için Kara Kış zehri bulaşmış kara nilüferleri ayırt et, 3 Kutsal Arı Nilüfer topla ve kamp ateşinde Panzehir Şerbeti pişir.',
    objectives: [
      {
        id: 'obj_gather_pure_lotus',
        type: 'COLLECT',
        descriptionTr: 'Tapınak çevresinden 3 Kutsal Arı Nilüfer topla',
        currentCount: 0,
        targetCount: 3,
        targetCoords: { x: -128, y: -11.5, z: -45 },
        isDone: false
      },
      {
        id: 'obj_cook_panzehir',
        type: 'COLLECT',
        descriptionTr: 'Kamp ateşinde Panzehir Şerbeti pişir ve Şahmaran’a sun',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -130, y: -10.5, z: -45 },
        isDone: false
      }
    ],
    rewardTr: 'Şahmaran Kutsaması & Yelbegen Zayıflık Bilgisi',
    state: 'ACTIVE',
    nextQuestId: 'quest_yelbegen_yikimi',
    beaconPos: { x: -130, y: -10.5, z: -45 }
  },

  {
    id: 'quest_yelbegen_yikimi',
    titleTr: '7 Başlı Yelbegen ve Su Kutu',
    type: 'MAIN',
    chapterTr: 'Şahmaran Gölü',
    descriptionTr: 'Harap Köy su tahliye kapağını aç, yeraltı su mağarasına in. 7 Başlı Yelbegen’i alt et, kopan başları ateşle dağlayarak yeniden büyümesini durdur ve kutsal SU KUTU’nu kazan.',
    objectives: [
      {
        id: 'obj_open_sluice_gate',
        type: 'DISCOVER',
        descriptionTr: 'Kıyıdaki Harap Köy su tahliye vanasını çevir',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -47, y: 1.2, z: 2 },
        isDone: false
      },
      {
        id: 'obj_defeat_yelbegen',
        type: 'KILL',
        descriptionTr: '7 Başlı Yelbegen’i alt et ve SU KUTU’nu al',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: -130, y: -12.0, z: -45 },
        isDone: false
      }
    ],
    rewardTr: 'SU KUTU (Sınırsız Nefes & Su İçi Can Yenilenmesi) & 50 Kut Tozu',
    state: 'LOCKED',
    nextQuestId: 'quest_gok_zirve',
    beaconPos: { x: -130, y: -12.0, z: -45 }
  },

  {
    id: 'quest_gok_zirve',
    titleTr: 'Gök Zirve: Altayların Tipisi',
    type: 'MAIN',
    chapterTr: 'Gök Zirve & Dokuz Kat Yeraltı',
    descriptionTr: 'Kuzeyin dondurucu Gök Zirvesine tırman. Tipi ve çığları aş, sığınak mağaralarına sığın ve Umay Ana Mabedi’ne ulaş.',
    objectives: [
      {
        id: 'obj_climb_gok_zirve',
        type: 'DISCOVER',
        descriptionTr: 'Gök Zirve’nin karlı yamaçlarına tırman',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 110, y: 28.0, z: 120 },
        isDone: false
      },
      {
        id: 'obj_survive_avalanche',
        type: 'INTERACT',
        descriptionTr: 'Çığ felaketinde sığınak mağaralarına sığın',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 104, y: 28.0, z: 116 },
        isDone: false
      }
    ],
    rewardTr: 'Gök Seti Direnci & Umay Mabedi Yolu',
    state: 'LOCKED',
    nextQuestId: 'quest_umay_sinavi',
    beaconPos: { x: 110, y: 28.0, z: 120 }
  },

  {
    id: 'quest_umay_sinavi',
    titleTr: 'Umay Ana’nın Üç Sınavı',
    type: 'MAIN',
    chapterTr: 'Gök Zirve & Dokuz Kat Yeraltı',
    descriptionTr: 'Umay Ana Altarı önünde Cesaret, Merhamet ve Denge sınavlarını tamamlayarak son parça olan GÖK KUTU’nu kazan.',
    objectives: [
      {
        id: 'obj_trial_courage',
        type: 'KILL',
        descriptionTr: 'Cesaret Sınavı: Kara Kış körmöz dalgasına dayan',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 110, y: 28.0, z: 140 },
        isDone: false
      },
      {
        id: 'obj_trial_mercy',
        type: 'INTERACT',
        descriptionTr: 'Merhamet Sınavı: Donan Albız yavrusunu ateşle ısıt',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 110, y: 28.0, z: 140 },
        isDone: false
      },
      {
        id: 'obj_trial_balance',
        type: 'INTERACT',
        descriptionTr: 'Denge Sınavı: Yer-Gök antik terazisini 3=3 dengele',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 110, y: 28.0, z: 140 },
        isDone: false
      }
    ],
    rewardTr: 'GÖK KUTU (Çift Zıplama & Tam Donma Bağışıklığı)',
    state: 'LOCKED',
    nextQuestId: 'quest_dokuz_kat_yeralti',
    beaconPos: { x: 110, y: 28.0, z: 140 }
  },

  {
    id: 'quest_dokuz_kat_yeralti',
    titleTr: 'Dokuz Kat Yeraltı: Tamu Krallığı',
    type: 'MAIN',
    chapterTr: 'Gök Zirve & Dokuz Kat Yeraltı',
    descriptionTr: 'Gök Zirve’deki kara mağara kapısından Dokuz Kat Yeraltı’na in. 9 mekanik sınavı aşarak Taht Salonu’na ulaş.',
    objectives: [
      {
        id: 'obj_descend_yeralti',
        type: 'DISCOVER',
        descriptionTr: 'Dokuz Kat Yeraltı Tamu kapısından içeri adım at',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 115, y: 32.0, z: 155 },
        isDone: false
      },
      {
        id: 'obj_reach_throne_room',
        type: 'DISCOVER',
        descriptionTr: '9 katı aşarak Erlik Han’ın Taht Salonu’na ulaş',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 450, y: -72.0, z: 0 },
        isDone: false
      }
    ],
    rewardTr: 'Tamu Kontrol Noktaları Açılışı & Taht Salonu Erişimi',
    state: 'LOCKED',
    nextQuestId: 'quest_erlik_han_final',
    beaconPos: { x: 115, y: 32.0, z: 155 }
  },

  {
    id: 'quest_erlik_han_final',
    titleTr: 'Büyük Final: Erlik Han ve Ötüken’in Kaderi',
    type: 'MAIN',
    chapterTr: 'Gök Zirve & Dokuz Kat Yeraltı',
    descriptionTr: 'Yeraltının ve Kara Kış’ın hakimi Erlik Han ile yüzleş. Üç düzeni kır, Erlik diz çöktüğünde Ötüken’in nihai kaderini belirle: Denge mi, Yıkım mı?',
    objectives: [
      {
        id: 'obj_defeat_erlik_phase1',
        type: 'KILL',
        descriptionTr: 'Erlik Han’ın gölge kopyalarını ve mızraklarını bertaraf et',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 450, y: -72.0, z: 0 },
        isDone: false
      },
      {
        id: 'obj_break_erlik_regimes',
        type: 'INTERACT',
        descriptionTr: 'Gölge Kalkanı (Ateş), Kara Girdap (Rüzgâr) ve Donmuş An (Kut Zamanı) güçlerini kır',
        currentCount: 0,
        targetCount: 3,
        targetCoords: { x: 450, y: -72.0, z: 0 },
        isDone: false
      },
      {
        id: 'obj_make_ending_choice',
        type: 'INTERACT',
        descriptionTr: 'Diz çöken Erlik Han karşısında kaderini seç: DENGE (Kut’u köklere sun) veya YIKIM',
        currentCount: 0,
        targetCount: 1,
        targetCoords: { x: 450, y: -72.0, z: 0 },
        isDone: false
      }
    ],
    rewardTr: 'ÖTÜKEN DESTANI TAMAMLANDI (Yeni Oyun+ & Kut Ezgisi)',
    state: 'LOCKED',
    beaconPos: { x: 450, y: -72.0, z: 0 }
  }
];
