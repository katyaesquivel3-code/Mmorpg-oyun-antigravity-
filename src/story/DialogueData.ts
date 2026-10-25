/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Dallanmalı Diyalog Ağacı & Koşul Veri Havuzu (DialogueData)
 * (Korkut Ata, Bamsı, Günçiçek, Toygun, Yaralı Oba Halkı, Koşullu Seçenekler & Mitolojik Anlatı)
 */

export interface DialogueCondition {
  questId?: string;
  questState?: 'ACTIVE' | 'OBJECTIVE_MET' | 'COMPLETED' | 'LOCKED';
  requiredItem?: string;
  itemCount?: number;
  storyFlag?: string;
}

export interface DialogueChoice {
  text: string;
  nextNodeId: string;
  action?: string; // e.g. 'quest:accept:quest_kul_olan_oba', 'reward:sword_damage_boost'
  condition?: DialogueCondition;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  choices?: DialogueChoice[];
  isEnd?: boolean;
}

export const DIALOGUE_NODES: Record<string, DialogueNode> = {
  // ================= 1. ULU KAM KORKUT ATA =================
  'korkut_main': {
    id: 'korkut_main',
    speaker: 'Ulu Kam Korkut Ata',
    text: 'Esenlikler Ayaz... Erlik Han’ın Kara Kış körmözleri gökleri kararttı, kutsal Bay Terek kuruyor. Gök Tengri’nin Kut’unu yeniden bir araya getirmeliyiz.',
    choices: [
      {
        text: 'Oba halkına yardım ettim, kutsal kemerini getirdim!',
        nextNodeId: 'korkut_kul_turnin',
        condition: { questId: 'quest_kul_olan_oba', questState: 'OBJECTIVE_MET' }
      },
      {
        text: 'Tepegöz’ü devirdim, Yer Kutu’nu getirdim!',
        nextNodeId: 'korkut_tepegoz_defeat',
        condition: { questId: 'quest_yersubun_kalbi', questState: 'OBJECTIVE_MET' }
      },
      {
        text: 'Bay Terek’in köklerinde Tengri vizyonu gördüm!',
        nextNodeId: 'korkut_bay_terek_vizyon',
        condition: { questId: 'quest_bay_terek_fisilti', questState: 'OBJECTIVE_MET' }
      },
      { text: 'Kut’un dört parçası nerededir?', nextNodeId: 'korkut_pieces_info' },
      { text: 'Börü bana yolculuğumda nasıl rehberlik edecek?', nextNodeId: 'korkut_boru_info' },
      { text: 'İzninizle ulu Kam, bozkır beni bekler.', nextNodeId: 'korkut_farewell' }
    ]
  },

  'korkut_kul_turnin': {
    id: 'korkut_kul_turnin',
    speaker: 'Ulu Kam Korkut Ata',
    text: 'Tengri senden razı olsun evladım! Yaralıların iniltisi dindi, ataların kemeri kutsal ocağa kavuştu. Şimdi Börü’nün burnunu takip et; hainler kutsal Sedir Kopuzumu güneye kaçırdı!',
    choices: [
      {
        text: 'Börü’nün koku izini sürüp kopuzu kurtaracağım!',
        nextNodeId: 'korkut_accept_boru_quest',
        action: 'quest:accept:quest_borunun_izi'
      }
    ]
  },

  'korkut_accept_boru_quest': {
    id: 'korkut_accept_boru_quest',
    speaker: 'Ulu Kam Korkut Ata',
    text: 'Börü’ye "Kokla" emrini ver, rüzgârın getirdiği altın parçacıkları izle. Kopuz olmadan Bay Terek’in fısıltısını duyamayız.',
    isEnd: true
  },

  'korkut_bay_terek_vizyon': {
    id: 'korkut_bay_terek_vizyon',
    speaker: 'Ulu Kam Korkut Ata',
    text: 'Gök Tengri’nin ışığı gözlerine inmiş Ayaz! Dört parça: Yer-Sub toprağı, Demir Dağ ateşi, Şahmaran suyu ve Altay göğü... Artık hazırsın, güneydeki amfiteatrda Tepegöz’ün karşısına çıkma vaktidir!',
    choices: [
      {
        text: 'Tepegöz’ün inine gidiyorum! Yer Kutu bizim olacak!',
        nextNodeId: 'korkut_tepegoz_accept',
        action: 'quest:accept:quest_yersubun_kalbi'
      }
    ]
  },

  'korkut_tepegoz_accept': {
    id: 'korkut_tepegoz_accept',
    speaker: 'Ulu Kam Korkut Ata',
    text: 'Unutma: Tepegöz’ün devasa gövdesine kılıç işlemez. Gözünü açtığı an yayını ger ve Basat gibi gözünün bebeğinden vur!',
    isEnd: true
  },

  'korkut_tepegoz_defeat': {
    id: 'korkut_tepegoz_defeat',
    speaker: 'Ulu Kam Korkut Ata',
    text: 'Ulu Gök Tengri hakkı için! Yer Kutu parıldıyor, Bay Terek’in ilk ulu budağı yeşerdi! Al bu Alev Temrenlerini... Doğuya, karlı Demir Dağ’ın böğründeki Ergenekon’a doğru sür atını. Ateş Kutu seni çağırıyor!',
    choices: [
      {
        text: 'Alev Temrenlerini alıyorum. Demir Dağ’a yolculuk başlasın!',
        nextNodeId: 'korkut_ergenekon_farewell',
        action: 'reward:fire_arrows'
      }
    ]
  },

  'korkut_ergenekon_farewell': {
    id: 'korkut_ergenekon_farewell',
    speaker: 'Ulu Kam Korkut Ata',
    text: 'Gözün pek, bileğin bükülmez olsun Ayaz. Ergenekon’un kor ateşleri sana boyun eğsin!',
    isEnd: true
  },

  'korkut_pieces_info': {
    id: 'korkut_pieces_info',
    speaker: 'Ulu Kam Korkut Ata',
    text: 'Kut dört ulu unsurdur: Yer Kutu (orman ve toprak), Ateş Kutu (Demir Dağ ocağı), Su Kutu (Şahmaran Gölü derinlikleri) ve Gök Kutu (Altay’ın karlı doruğu). Dördü birleşmeden Kara Kış bitmez.',
    choices: [
      { text: 'Hepsini bulup obayı yeniden dirilteceğim!', nextNodeId: 'korkut_main' }
    ]
  },

  'korkut_boru_info': {
    id: 'korkut_boru_info',
    speaker: 'Ulu Kam Korkut Ata',
    text: 'Börü sıradan bir kurt değildir; Gök Tengri’nin yeryüzündeki yeleli elçisidir. Ona "Kokla" dediğinde en gizli Balbalları ve kurganları havadan sezer. Savaşta düşmanı bacağından kapıp sersemletir.',
    choices: [
      { text: 'Börü’nün sadakati bana güç veriyor.', nextNodeId: 'korkut_main' }
    ]
  },

  'korkut_farewell': {
    id: 'korkut_farewell',
    speaker: 'Ulu Kam Korkut Ata',
    text: 'Kut seninle olsun, ataların ruhu kılıcına yoldaşlık etsin.',
    isEnd: true
  },

  // ================= 2. DEMİRCİ BAMSI =================
  'bamsi_forge': {
    id: 'bamsi_forge',
    speaker: 'Demirci Bamsı',
    text: 'Körük harlansın, çekiç dövsün! Hoş geldin Ayaz kardeş. Kılıcın körlenmiş mi, zırhın delinmiş mi?',
    choices: [
      {
        text: 'Gölge Boğazı kampını temizledim, 5 demir cevheri getirdim!',
        nextNodeId: 'bamsi_iron_turnin',
        condition: { questId: 'quest_demircinin_borcu', questState: 'OBJECTIVE_MET' }
      },
      {
        text: 'Kara Totem kampını basıp demir getireceğim.',
        nextNodeId: 'bamsi_iron_quest_accept',
        condition: { questId: 'quest_demircinin_borcu', questState: 'LOCKED' }
      },
      { text: 'Savaş Baltası kalkanları nasıl parçalar?', nextNodeId: 'bamsi_axe_tip' },
      { text: 'İyi çalışmalar Bamsı usta.', nextNodeId: 'bamsi_farewell' }
    ]
  },

  'bamsi_iron_quest_accept': {
    id: 'bamsi_iron_quest_accept',
    speaker: 'Demirci Bamsı',
    text: 'Erlik körmözleri doğudaki boğazda kamp kurmuş. Ortadaki Kara Totem’i baltayla yıkıp bana 5 parça demir cevheri getirirsen, Kam Kılıcı’na öyle bir su veririm ki taşı ikiye böler!',
    choices: [
      {
        text: 'Demir Dağ eteklerindeki kampı temizleyeceğim!',
        nextNodeId: 'bamsi_forge',
        action: 'quest:accept:quest_demircinin_borcu'
      }
    ]
  },

  'bamsi_iron_turnin': {
    id: 'bamsi_iron_turnin',
    speaker: 'Demirci Bamsı',
    text: 'Ha şöyle! Ak demir kor ateşte erisin! Al bakalım kılıcını... Namlusuna kurt dişi suyu verdim (+10 Keskinlik Hasarı). Artık hiçbir körmöz zırhı sana kalkan olamaz!',
    choices: [
      {
        text: 'Eline sağlık koca usta! Kılıç alev saçıyor.',
        nextNodeId: 'bamsi_farewell',
        action: 'reward:sword_damage_boost'
      }
    ]
  },

  'bamsi_axe_tip': {
    id: 'bamsi_axe_tip',
    speaker: 'Demirci Bamsı',
    text: 'Yek savaşçıları kemik kalkanlarının ardına saklanır. Elindeki kılıç kalkanı çizemez bile. Ama sırtındaki ağır Savaş Baltasını savurdun mu o kalkan un ufak olur!',
    choices: [
      { text: 'Bu öğüdü savaşta kullanacağım.', nextNodeId: 'bamsi_forge' }
    ]
  },

  'bamsi_farewell': {
    id: 'bamsi_farewell',
    speaker: 'Demirci Bamsı',
    text: 'Çeliğin soğumasın, bileğin yorulmasın!',
    isEnd: true
  },

  // ================= 3. AVCI GÜNÇİÇEK =================
  'hunter_lodge': {
    id: 'hunter_lodge',
    speaker: 'Avcı Günçiçek',
    text: 'Sessiz ol Ayaz... Bozkırın kulağı deliktir. Rüzgârı karşına almazsan maral seni yüz adımdan koklar.',
    choices: [
      {
        text: 'Şafak vakti maral avladım, taze av etini getirdim!',
        nextNodeId: 'hunter_hunt_turnin',
        condition: { questId: 'quest_avcinin_sirri', questState: 'OBJECTIVE_MET' }
      },
      {
        text: 'Bana bozkırda yay ve gizlilik talimi verir misin?',
        nextNodeId: 'hunter_quest_accept',
        condition: { questId: 'quest_avcinin_sirri', questState: 'LOCKED' }
      },
      { text: 'Uzun otlarda nasıl görünmez olunur?', nextNodeId: 'hunter_stealth_tip' },
      { text: 'Bereketli avlar Günçiçek.', nextNodeId: 'hunter_farewell' }
    ]
  },

  'hunter_quest_accept': {
    id: 'hunter_quest_accept',
    speaker: 'Avcı Günçiçek',
    text: 'Çömelerek çalıların arasına sin. Ayak sesini sıfıra indir. Bozkırda bir maral avlayıp etini oba mutfağına getir, sana özel gizlilik pelerinini ve ok sadak kapasiteni artırayım!',
    choices: [
      {
        text: 'Maralın izini sürmeye gidiyorum.',
        nextNodeId: 'hunter_lodge',
        action: 'quest:accept:quest_avcinin_sirri'
      }
    ]
  },

  'hunter_hunt_turnin': {
    id: 'hunter_hunt_turnin',
    speaker: 'Avcı Günçiçek',
    text: 'Usta bir avcısın Ayaz! Maral eti kışa giren oba çocuklarını doyuracak. Al bu ekstra sadak bağını; artık 45 ok taşıyabilirsin!',
    choices: [
      {
        text: 'Teşekkürler Günçiçek, yayım obanın bekçisidir.',
        nextNodeId: 'hunter_farewell',
        action: 'reward:quiver_upgrade'
      }
    ]
  },

  'hunter_stealth_tip': {
    id: 'hunter_stealth_tip',
    speaker: 'Avcı Günçiçek',
    text: 'Çömeldiğinde ayak sesin kısılır. Uzun bozkır otlarının içine girdiğinde düşmanlar seni gözlerinin önünde olsa bile göremez. Arkalarından yaklaşıp "Sessiz Vuruş" indirirsen üç kat hasar vurursun!',
    choices: [
      { text: 'Sessizlik en keskin oktur.', nextNodeId: 'hunter_lodge' }
    ]
  },

  'hunter_farewell': {
    id: 'hunter_farewell',
    speaker: 'Avcı Günçiçek',
    text: 'Gözün hedeften, okun yaydan ayrılmasın.',
    isEnd: true
  },

  // ================= 4. OZAN TOYGUN =================
  'ozan_legends': {
    id: 'ozan_legends',
    speaker: 'Ozan Toygun',
    text: 'Kopuzun teli inler, ataların ruhu dinler... Hoş geldin Ayaz yiğit. Hangi destanı dinlemek istersin?',
    choices: [
      {
        text: 'Kam Ata’nın çalınan sedir kopuzunu buldum!',
        nextNodeId: 'ozan_kopuz_turnin',
        condition: { questId: 'quest_borunun_izi', questState: 'OBJECTIVE_MET' }
      },
      {
        text: 'Obada ağlayan anayı gördüm, kayıp çocuk nerede?',
        nextNodeId: 'ozan_lost_child_hint',
        condition: { questId: 'quest_kayip_cocuk', questState: 'ACTIVE' }
      },
      { text: 'Basat ve Tepegöz’ün destanını anlat.', nextNodeId: 'ozan_tepegoz_tale' },
      { text: 'Gök Kurt Börü efsanesi nedir?', nextNodeId: 'ozan_boru_tale' },
      { text: 'Sazın susmasın Ozan.', nextNodeId: 'ozan_farewell' }
    ]
  },

  'ozan_kopuz_turnin': {
    id: 'ozan_kopuz_turnin',
    speaker: 'Ozan Toygun',
    text: 'Aman Tengri! Kadim sedir ağacı kopuzu... Tellerine dokununca obanın dumanı dağılıyor! Al bu kadim ezgiyi, Bay Terek’in dibinde çalarsan Gök Tengri sana vizyonunu açacaktır!',
    choices: [
      {
        text: 'Bay Terek’e gidip vizyonu arayacağım!',
        nextNodeId: 'ozan_farewell',
        action: 'quest:accept:quest_bay_terek_fisilti'
      }
    ]
  },

  'ozan_lost_child_hint': {
    id: 'ozan_lost_child_hint',
    speaker: 'Ozan Toygun',
    text: 'Küçük çocuk güneybatıdaki ardıç koruluğuna doğru kaçmış diyorlar. Börü’ye "Kokla" de, çocuğun düşürdüğü keçe oyuncağın kokusunu hemen alacaktır!',
    choices: [
      { text: 'Hemen koruluğa gidiyorum!', nextNodeId: 'ozan_farewell' }
    ]
  },

  'ozan_tepegoz_tale': {
    id: 'ozan_tepegoz_tale',
    speaker: 'Ozan Toygun',
    text: 'Tepegöz ki anası bir alageyik perisi, atası bir çobandır. Alnındaki tek gözüyle dağları inletir. Dede Korkut boylarında Basat, ateşte kızdırdığı şişi onun gözüne vurup Türk ilini kurtarmıştır.',
    choices: [
      { text: 'Ben de Basat gibi o devi devireceğim!', nextNodeId: 'ozan_legends' }
    ]
  },

  'ozan_boru_tale': {
    id: 'ozan_boru_tale',
    speaker: 'Ozan Toygun',
    text: 'Ergenekon’da Türk milleti demir dağı eritip yol ararken, önlerine gök yeleli bir Bozkurt düşmüştür. O kurt Gök Tengri’nin kutlu kılavuzudur.',
    choices: [
      { text: 'Börü daima yanımda olacak.', nextNodeId: 'ozan_legends' }
    ]
  },

  'ozan_farewell': {
    id: 'ozan_farewell',
    speaker: 'Ozan Toygun',
    text: 'Tengri sazımıza güç, yoluna ışık versin.',
    isEnd: true
  },

  // ================= 5. YARALI OBA HALKI =================
  'villager_oguz': {
    id: 'villager_oguz',
    speaker: 'Yaralı Oğuz',
    text: 'Ah Ayaz... Çadırımızı yaktılar, omuzumdan yaralandım. Şifa meyvesi bulabilir misin?',
    choices: [
      {
        text: 'Al bu Can Meyvesi’ni, yaranı saracaktır.',
        nextNodeId: 'villager_healed',
        action: 'quest:advance:quest_kul_olan_oba'
      },
      { text: 'Dayan Oğuz, yardım getireceğim.', nextNodeId: 'villager_wait' }
    ]
  },

  'villager_ilbilge': {
    id: 'villager_ilbilge',
    speaker: 'Yaralı İlbilge',
    text: 'Korkudan dizlerim tutmaz oldu... Körmözler Kam Ata’nın altın kemerini alıp Bay Terek’in arkasındaki kayalığa attılar!',
    choices: [
      {
        text: 'Korkma İlbilge, kemeri bulup Kam Ata’ya getireceğim.',
        nextNodeId: 'villager_healed',
        action: 'quest:advance:quest_kul_olan_oba'
      }
    ]
  },

  'villager_healed': {
    id: 'villager_healed',
    speaker: 'Oba Sakini',
    text: 'Sağ olasın Ayaz yiğit! Tengri senin kılıcını bilesin!',
    isEnd: true
  },

  'villager_wait': {
    id: 'villager_wait',
    speaker: 'Oba Sakini',
    text: 'Çabuk ol yiğidim, dumanlar boğazımızı yakıyor...',
    isEnd: true
  },

  'mother_lost_child': {
    id: 'mother_lost_child',
    speaker: 'Ağlayan Ana',
    text: 'Yavrum... Küçük Alpagut korulukta kayboldu! Ne olur onu bana bul getir Ayaz!',
    choices: [
      {
        text: 'Ağlama ana, Börü ile birlikte çocuğunu bulup getireceğim!',
        nextNodeId: 'mother_accepted',
        action: 'quest:accept:quest_kayip_cocuk'
      }
    ]
  },

  'mother_accepted': {
    id: 'mother_accepted',
    speaker: 'Ağlayan Ana',
    text: 'Gök Tengri senden razı olsun, Börü’nün burnu yavrumun kokusunu bulur!',
    isEnd: true
  },

  // ================= FAZ 9: ERGENEKON & BAŞ DEMİRCİ KIZIL USTA =================
  'kizil_usta_main': {
    id: 'kizil_usta_main',
    speaker: 'Baş Demirci Kızıl Usta',
    text: 'Dört yüz yıldır bu sarp kayalıkların, eritilemez demir dağların ardında sıkıştık kaldık evlat... Asena bize yol gösterdi lakin önümüzdeki koca demir dağı eritmeden kimse bu vadiden çıkamaz. 7 körük ocağını harla, Ateş ve Yel ile dağı eritelim!',
    choices: [
      {
        text: 'Körükleri nasıl harlayabilirim usta?',
        nextNodeId: 'kizil_usta_koruk_info'
      },
      {
        text: 'Çırağının lav kıyısına düşürdüğü antik vanayı getirdim!',
        nextNodeId: 'kizil_usta_cirak_reward',
        condition: { questId: 'quest_ciragin_korugu', questState: 'OBJECTIVE_MET' }
      },
      {
        text: 'Madenlerden saf demir getirdim, Erimeyen Kılıcı dövelim!',
        nextNodeId: 'kizil_usta_kilic_forge',
        condition: { questId: 'quest_erimeyen_kilic', questState: 'OBJECTIVE_MET' }
      },
      {
        text: 'Demir dağı erittim, geçit açıldı!',
        nextNodeId: 'kizil_usta_gate_melted',
        condition: { questId: 'quest_ergenekon_destani', questState: 'ACTIVE' }
      },
      {
        text: 'Demir Dağ Bekçisi’ni yendim, ATEŞ KUTU kurtuldu!',
        nextNodeId: 'kizil_usta_boss_victory',
        condition: { questId: 'quest_ergenekon_destani', questState: 'OBJECTIVE_MET' }
      },
      {
        text: 'Ocağınız dumanı eksik olmasın usta, vadiyi keşfe çıkıyorum.',
        nextNodeId: 'kizil_usta_farewell'
      }
    ]
  },

  'kizil_usta_koruk_info': {
    id: 'kizil_usta_koruk_info',
    speaker: 'Baş Demirci Kızıl Usta',
    text: 'Vadide sıralı 7 körük ocağı var. Her ocağın koluna yaklaşıp körükle, ardından Ülgen’in Kıvılcımı ile ateş ver! 7 ocak birden akkor olduğunda demir kapı lav gibi akacak!',
    choices: [
      {
        text: 'Anladım usta, körükleri harlamaya gidiyorum!',
        nextNodeId: 'kizil_usta_farewell',
        action: 'quest:advance:quest_ergenekon_destani'
      }
    ]
  },

  'kizil_usta_gate_melted': {
    id: 'kizil_usta_gate_melted',
    speaker: 'Baş Demirci Kızıl Usta',
    text: 'Gök Tengri aşkına! Dağ eridi, asırlık demir kapı çöktü! Lakin dikkat et; ocağın derinliklerinde Erlik Han’ın demirci devi Demir Dağ Bekçisi uykusundan uyandı!',
    isEnd: true
  },

  'kizil_usta_cirak_reward': {
    id: 'kizil_usta_cirak_reward',
    speaker: 'Baş Demirci Kızıl Usta',
    text: 'Sağ olasın evlat! Genç çırak o vanayı düşürünce ocağın soluğu kesilmişti. Al bu Naneli Ayran’ı iç; lav sıcaklığına karşı ciğerlerini serin tutar. Bu kalkan da Ergenekon demircilerinin hediyesidir!',
    choices: [
      {
        text: 'Teşekkürler Kızıl Usta!',
        nextNodeId: 'kizil_usta_farewell',
        action: 'quest:advance:quest_ciragin_korugu'
      }
    ]
  },

  'kizil_usta_kilic_forge': {
    id: 'kizil_usta_kilic_forge',
    speaker: 'Baş Demirci Kızıl Usta',
    text: 'İşte has Türk demiri! Örsümün başına geç, çekici vur! Bu kılıç ne taşa çarpmakla kırılır ne de düşman kalkanında eğrilir!',
    choices: [
      {
        text: 'Kılıcı al ve kuşan!',
        nextNodeId: 'kizil_usta_farewell',
        action: 'quest:advance:quest_erimeyen_kilic'
      }
    ]
  },

  'kizil_usta_boss_victory': {
    id: 'kizil_usta_boss_victory',
    speaker: 'Baş Demirci Kızıl Usta',
    text: 'Destan tamamlandı Ayaz! Demir Dağ Bekçisi devrildi, Ateş Kutu ellerinde parlıyor! Vadinin çıkışına git; göklerin kanatlı atı Tulpar seni bekler!',
    isEnd: true
  },

  'kizil_usta_farewell': {
    id: 'kizil_usta_farewell',
    speaker: 'Baş Demirci Kızıl Usta',
    text: 'Kut’un ateşi yolunu aydınlatsın!',
    isEnd: true
  },

  // ================= 7. BİLGE LOKMAN HEKİM (ŞAHMARAN GÖLÜ) =================
  'lokman_hekim_greet': {
    id: 'lokman_hekim_greet',
    speaker: 'Bilge Lokman Hekim',
    text: 'Hoş geldin gök yüzlü Ayaz... Erlik Han’ın körmözleri gölün damarlarına kara zehir akıttı. Yılanların şahı, bilge Su İyesi Şahmaran zehirle delirdi, batık tapınağa çekildi. Göl arınmazsa Ötüken’in suları kuruyacak!',
    choices: [
      {
        text: 'Şahmaran’ı ve gölü nasıl kurtarabilirim?',
        nextNodeId: 'lokman_quest_explain'
      },
      {
        text: 'Nilüfer adalarından topladığım 3 şifalı çiçeği getirdim!',
        nextNodeId: 'lokman_lotus_turnin',
        condition: { questId: 'quest_lokman_sifa_otu', questState: 'OBJECTIVE_MET' }
      },
      {
        text: 'Zehirli pınarları körmözlerden temizledim!',
        nextNodeId: 'lokman_spring_turnin',
        condition: { questId: 'quest_zehirli_pinarlar', questState: 'OBJECTIVE_MET' }
      },
      {
        text: 'Bana derin sularda nefes alma ve yüzme öğüdü ver.',
        nextNodeId: 'lokman_underwater_tip'
      },
      { text: 'Sular yolunu bulsun Lokman Ata.', nextNodeId: 'lokman_farewell' }
    ]
  },

  'lokman_quest_explain': {
    id: 'lokman_quest_explain',
    speaker: 'Bilge Lokman Hekim',
    text: 'Batık tapınak arenasında 3 kutsal arıtıcı pınar taşı var. Şahmaran zehir kalkanına büründüğünde ona kılıç işlemez! Taşların vanalarını açıp kutsal pınarları fışkırtırsan arınma şoku zırhını kırar! Dikkat et, suda nefesin tükenirse hava kabarcığı menfezlerine sığın!',
    choices: [
      {
        text: 'Kutsal pınarları açmaya ve Şahmaran’ı kurtarmaya gidiyorum!',
        nextNodeId: 'lokman_farewell',
        action: 'quest:advance:quest_sahmaran_destani'
      }
    ]
  },

  'lokman_lotus_turnin': {
    id: 'lokman_lotus_turnin',
    speaker: 'Bilge Lokman Hekim',
    text: 'Eline sağlık cesur kam! Bu kutsal nilüferler gölün ilk saf tohumlarıdır. Al bu panzehir iksirini iç ve tarifini zihnine kazı. Zehirli yaratıkların ısırığı artık canını yakamaz!',
    choices: [
      {
        text: 'Teşekkürler Lokman Ata.',
        nextNodeId: 'lokman_farewell',
        action: 'quest:advance:quest_lokman_sifa_otu'
      }
    ]
  },

  'lokman_spring_turnin': {
    id: 'lokman_spring_turnin',
    speaker: 'Bilge Lokman Hekim',
    text: 'Pınarların sesi değişti, berrak suyun şırıltısı geri döndü! Al bu Su Yek mızrağını; amfibik çelikle dövülmüştür, su altı akıntılarında bile yönünü şaşırtmaz!',
    choices: [
      {
        text: 'Gölün selameti için!',
        nextNodeId: 'lokman_farewell',
        action: 'quest:advance:quest_zehirli_pinarlar'
      }
    ]
  },

  'lokman_underwater_tip': {
    id: 'lokman_underwater_tip',
    speaker: 'Bilge Lokman Hekim',
    text: 'Suya daldığında ciğerlerindeki nefes tükenmeye başlar. Göl tabanındaki taş menfezlerden çıkan hava kabarcıklarına yaklaşırsan nefesin tazelenir. Ancak asıl kurtuluş SU KUTU’dur; onu kazandığında suda balık gibi nefes alırsın!',
    choices: [
      { text: 'Öğüdünü aklımda tutacağım.', nextNodeId: 'lokman_hekim_greet' }
    ]
  },

  'lokman_boss_victory': {
    id: 'lokman_boss_victory',
    speaker: 'Bilge Lokman Hekim',
    text: 'Tengri biz menen! Şahmaran’ın gözlerindeki zehir silindi, gölün suları zümrüt gibi ışıldıyor! Su Kutu seninle dirildi Ayaz! Şimdi kutlu Hayat Ağacı Bay Terek’in kökleri bu kutsal suyla beslenecek!',
    isEnd: true
  },

  'lokman_farewell': {
    id: 'lokman_farewell',
    speaker: 'Bilge Lokman Hekim',
    text: 'Su gibi aziz ol, ömrün pınarlar gibi çağlasın.',
    isEnd: true
  },

  // ================= 8. MÜTTEFİK BİLGE ŞAHMARAN (KUTSAL SIĞINAK) =================
  'sahmaran_sanctuary_greet': {
    id: 'sahmaran_sanctuary_greet',
    speaker: 'Bilge Şahmaran',
    text: 'Batık yurduma hoş geldin Ayaz... Yüzyıllar evvel Lokman ve insanoğlunun ihanetiyle yer altına çekildim. Şimdi gölün efendisi 7 Başlı Yelbegen uyandı, suları zehre boğdu. Sana güvenebilir miyim? Bana sırrımı koruyacağına dair yemin edebilir misin?',
    choices: [
      {
        text: 'And olsun Şahmaran! Ne sırrını ne yurdunu ele vermem!',
        nextNodeId: 'sahmaran_oath_accept',
        action: 'moral:oath_kept'
      },
      {
        text: 'Obam ve halkım can çekişirken hiçbir sırrı gizlemeye söz veremem.',
        nextNodeId: 'sahmaran_tribe_first',
        action: 'moral:tribe_first'
      },
      {
        text: 'Zehir ve Şifa Sınavı için pişirdiğim Panzehir Şerbeti’ni getirdim!',
        nextNodeId: 'sahmaran_trial_turnin',
        condition: { questId: 'quest_sahmaran_sinavi', questState: 'OBJECTIVE_MET' }
      },
      {
        text: '7 Başlı Yelbegen’i alt etmek için ne yapmalıyım?',
        nextNodeId: 'sahmaran_yelbegen_tip'
      },
      {
        text: 'Sular berrak kalsın bilge Şahmaran.',
        nextNodeId: 'sahmaran_farewell'
      }
    ]
  },

  'sahmaran_oath_accept': {
    id: 'sahmaran_oath_accept',
    speaker: 'Bilge Şahmaran',
    text: 'Sözün dağlar gibi sağlam olsun! Kadim şifa tılsımımı sana bahşediyorum (+%30 Zehir Direnci). Şimdi tapınak çevresindeki 3 saf nilüferi topla ve kamp ateşinde Panzehir Şerbeti pişir.',
    choices: [
      {
        text: 'Hemen sınavı tamamlayacağım!',
        nextNodeId: 'sahmaran_farewell',
        action: 'quest:advance:quest_sahmaran_sinavi'
      }
    ]
  },

  'sahmaran_tribe_first': {
    id: 'sahmaran_tribe_first',
    speaker: 'Bilge Şahmaran',
    text: 'Dürüstlüğün beni yaralasa da takdirimi kazandı. Yelbegen’in 7 başı sırayla kesilmelidir; ancak kesilen her baş 30 sn sonra yeniden uzar! Baş köklerini ATEŞLE DAĞLAMAK büyümeyi durdurur!',
    choices: [
      {
        text: 'Öğüdünü unutmayacağım Şahmaran.',
        nextNodeId: 'sahmaran_farewell',
        action: 'quest:advance:quest_sahmaran_sinavi'
      }
    ]
  },

  'sahmaran_trial_turnin': {
    id: 'sahmaran_trial_turnin',
    speaker: 'Bilge Şahmaran',
    text: 'Mükemmel bir şerbet! Saf nilüferlerin diriltici özü zehri yendi. Artık yeraltı su mağarasının kapısını açabilirsin. Yelbegen seni bekliyor, SU KUTU’nu kurtar!',
    choices: [
      {
        text: 'Yelbegen’i devirip SU KUTU’nu alacağım!',
        nextNodeId: 'sahmaran_farewell',
        action: 'quest:advance:quest_yelbegen_yikimi'
      }
    ]
  },

  'sahmaran_yelbegen_tip': {
    id: 'sahmaran_yelbegen_tip',
    speaker: 'Bilge Şahmaran',
    text: 'Yelbegen’in 6 element başı (Ateş, Buz, Zehir, Rüzgâr, Asit, Şimşek) kesilip dağlanmadan 7. Ulu Kara Baş’a hasar verilemez! 6 başı dağladığında son baş öfke fazına geçer ve su dalgaları savurur!',
    choices: [
      { text: 'Ateşimi hazır tutacağım!', nextNodeId: 'sahmaran_sanctuary_greet' }
    ]
  },

  'sahmaran_after_victory': {
    id: 'sahmaran_after_victory',
    speaker: 'Bilge Şahmaran',
    text: 'Yelbegen devrildi, kadim göl zehirden kurtuldu! SU KUTU kutlu ellerinde ışıldıyor Ayaz... Hayat Ağacı Bay Terek’in ulu dalları göğe yükselsin!',
    isEnd: true
  },

  'sahmaran_farewell': {
    id: 'sahmaran_farewell',
    speaker: 'Bilge Şahmaran',
    text: 'Suların ruhu seni gözetsin gök yüzlü kam.',
    isEnd: true
  },

  // ================= FAZ 11: GÖK ZİRVE & UMAY ANA =================
  'umay_shrine_greet': {
    id: 'umay_shrine_greet',
    speaker: 'Umay Ana',
    text: 'Hoş geldin Ayaz. Gök Zirve’nin dondurucu tepelerine ancak kalbinde kut ateşi taşıyan bir kam ulaşabilir. GÖK KUTU’nu hak etmek için üç kutsal erdemi kanıtlamalısın: Cesaret, Merhamet ve Denge!',
    choices: [
      {
        text: 'Sınavlara hazırım Umay Ana!',
        nextNodeId: 'umay_shrine_farewell',
        action: 'quest:advance:quest_umay_sinavi'
      }
    ]
  },

  'umay_trial_complete': {
    id: 'umay_trial_complete',
    speaker: 'Umay Ana',
    text: 'Üç sınavı da hakkaniyetle aştın. Donan yavruya merhamet ettin, körmözlere boyun eğmedin, Yer ile Gök terazisini dengede tuttun. Al bu GÖK KUTU’nu! Artık gökler ve rüzgârlar senin adımlarınla yükselecek. Şimdi Dokuz Kat Yeraltı’na in ve Erlik ile yüzleş!',
    isEnd: true
  },

  'umay_shrine_farewell': {
    id: 'umay_shrine_farewell',
    speaker: 'Umay Ana',
    text: 'Ak tüyüm yolunu aydınlatsın kutlu kam.',
    isEnd: true
  },

  // ================= FAZ 11: ERLİK HAN & FİNAL SEÇİMLERİ =================
  'erlik_throne_greet': {
    id: 'erlik_throne_greet',
    speaker: 'Erlik Han',
    text: 'Demek buraya kadar geldin küçük kam! Dört Kut Parçası’nı da toplamışsın. Ama Dokuz Kat Yeraltı’nın mutlak karanlığı ve ebedi soğuğu senin zayıf ışığını yutacaktır!',
    choices: [
      {
        text: 'Ötüken’i senin zulmünden kurtaracağım Erlik!',
        nextNodeId: 'erlik_fight_start'
      }
    ]
  },

  'erlik_fight_start': {
    id: 'erlik_fight_start',
    speaker: 'Erlik Han',
    text: 'Gelin gölgelerim! Kemik mızraklar ve kara girdap bu küstah kamı biçsin!',
    isEnd: true
  },

  'erlik_kneeling_choice': {
    id: 'erlik_kneeling_choice',
    speaker: 'Erlik Han',
    text: 'Gücün... Ülgen’in ateşi, Yel Ana’nın rüzgârı ve zamanın kendisi... Diz çöktüm işte! Söyle Ayaz, beni kökten yok mu edeceksin, yoksa yeraltının kadim dengesine boyun mu eğdireceksin?',
    choices: [
      {
        text: '⚖️ DENGE: Kut Parçalarını Bay Terek’e gömeceğim, sen karanlığın bekçisi olarak yerine döneceksin!',
        nextNodeId: 'erlik_choice_balance',
        action: 'ending:balance'
      },
      {
        text: '⚡ YIKIM: Sana merhamet yok Erlik! Seni kökten yok edeceğim!',
        nextNodeId: 'erlik_choice_ruin',
        action: 'ending:ruin'
      }
    ]
  },

  'erlik_final_choice': {
    id: 'erlik_final_choice',
    speaker: 'Erlik Han',
    text: 'Gücün... Ülgen’in ateşi, Yel Ana’nın rüzgârı ve zamanın kendisi... Diz çöktüm işte! Söyle Ayaz, beni kökten yok mu edeceksin, yoksa yeraltının kadim dengesine boyun mu eğdireceksin?',
    choices: [
      {
        text: '⚖️ DENGE: Kut Parçalarını Bay Terek’e gömeceğim, sen karanlığın bekçisi olarak yerine döneceksin!',
        nextNodeId: 'erlik_choice_balance',
        action: 'ending:balance'
      },
      {
        text: '⚡ YIKIM: Sana merhamet yok Erlik! Seni kökten yok edeceğim!',
        nextNodeId: 'erlik_choice_ruin',
        action: 'ending:ruin'
      }
    ]
  },

  'erlik_choice_balance': {
    id: 'erlik_choice_balance',
    speaker: 'Erlik Han',
    text: 'Akıllıca bir seçim kam... Işık karanlıksız, yaşam ölümsüz var olamaz. Ben karanlığıma dönüyorum, sen de güneşine dön!',
    isEnd: true
  },

  'erlik_choice_ruin': {
    id: 'erlik_choice_ruin',
    speaker: 'Erlik Han',
    text: 'Ahmak kam! Karanlığı yok edersen ışık da söner! Bay Terek meyvesiz kalacak, gör bak!',
    isEnd: true
  },

  // ================= FAZ 11: DUYGUSAL VEDA VE SON =================
  'kam_ata_final_farewell': {
    id: 'kam_ata_final_farewell',
    speaker: 'Kam Ata Korkut',
    text: 'Evlat... Ayaz... Bay Terek yeniden yeşerdi, dalları dokuz göğe uzanıyor. Kara Kış dindi, oba yeniden can buldu. Börü dağlara koşuyor, Tulpar göklerde süzülüyor. Vazifeni hakkıyla yerine getirdin kutlu kam.',
    isEnd: true
  },

  'boru_final_howl': {
    id: 'boru_final_howl',
    speaker: 'Börü',
    text: 'Auuuuu! (Börü başını dizine yaslar, altın gözleriyle sana bakar ve ulu bir sesle göğe ulur. Kadim bağınız ebedidir.)',
    isEnd: true
  }
};
