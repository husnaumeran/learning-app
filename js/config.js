const SUPABASE_URL = 'https://qwcigjclpxnwtfjhjggr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3Y2lnamNscHhud3RmamhqcWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDYyOTMsImV4cCI6MjA4ODM4MjI5M30.f1O-M128j8UD28Ts0QSRe6phkMLc_LlNdJHDbGbyvr4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============ CONFIGURATION ============
const CONFIG = {
    focusNumber: parseInt(localStorage.getItem('focusNumber')) || 7,
    colors: {pink:'#FF1493', orange:'#FF6600', green:'#00CC66', blue:'#0099FF'},
    categories: {
        animals: ['🐱','🐶','🐰','🐻','🐸','🐷','🐮','🦁','🐯','🐨'],
        fruits: ['🍎','🍊','🍇','🍓','🍌','🍉','🍑','🍒','🥝','🍋'],
        vegetables: ['🥕','🥦','🌽','🥒','🍆','🥬','🧅','🧄','🥔','🍅'],
        vehicles: ['🚗','🚌','🚁','🚂','🚀','🚲','🛵','🚒','✈️','🚢'],
        electronics: ['📱','💻','🖥️','📺','🎮','⌚','📷','🎧','🖨️','💡'],
        furniture: ['🛋️','🪑','🛏️','🚪','🪞','🖼️','🧸','🛁','🚿','🪴'],
        shoes: ['👟','👠','👢','👡','🥾','👞','🩴','⛸️','🛼','🎿'],
        clothes: ['👕','👖','👗','👔','🧥','👙','🩳','🧦','🧣','👒'],
        food: ['🍕','🍔','🍦','🍩','🧁','🍪','🌮','🍟','🥤','🍿'],
        dessert: ['🍰','🎂','🧁','🍫','🍬','🍭','🍡','🥧','🍮','🍨'],
        sky: ['⭐','🌙','☀️','🌈','☁️','⚡','🌟','💫','🌤️','🌸'],
        school: ['✏️','📚','🖍️','📏','✂️','🎒','📝','🖊️','📐','🎨'],
        sports: ['⚽','🏀','🎾','🏈','⚾','🏐','🎱','🏓','🥊','🏋️'],
        weather: ['🌧️','❄️','🌪️','🌊','🔥','💨','🌡️','☔','⛄','🌻'],
        insects: ['🦋','🐝','🐞','🐛','🦗','🐜','🪲','🦟','🪳','🕷️'],
        ocean: ['🐟','🐠','🦈','🐙','🦑','🦀','🐚','🐳','🦭','🪸'],
        birds: ['🐦','🦅','🦆','🦉','🐧','🦜','🕊️','🦢','🦩','🐔'],
        flowers: ['🌸','🌷','🌹','🌺','🌻','💐','🌼','🪻','🪷','🌱'],
        tools: ['🔨','🪛','🔧','🪚','🛠️','⚙️','🔩','📎','🧲','🪜'],
        music: ['🎵','🎸','🎹','🥁','🎺','🎷','🎻','🪘','🎤','🎼'],
        kitchen: ['🍳','🥄','🍴','🔪','🥣','🫖','☕','🍶','🧂','🥡'],
        space: ['🚀','🛸','👽','🌍','🪐','☄️','🌕','👨‍🚀','🛰️','🔭'],
        farm: ['🐄','🐖','🐑','🐓','🐴','🦃','🥚','🌾','🚜','🐐'],
        faces: ['😀','😂','😍','😎','🥳','😴','🤔','😱','🤗','🥰'],
        hands: ['👍','👏','🙌','👋','✌️','🤞','👊','🤝','💪','🖐️']
    },
    twoLetterWords: ['IN','AT','ON','OF','SO','TO','GO','UP','ME','IT'],
    threeLetterWords: ['CAT','DOG','SUN','BIG','RED','RUN','SIT','HAT','PEN','CUP'],
    traceUppercase: ['A','B','C','D','E'],
    traceLowercase: ['a','b','c','d','e'],
    traceNumbers: ['1','2','3','4','5','6','7']
};

let currentAnswers = [];

// Urdu Letters (isolated forms with harakat)
const URDU_LETTERS = [
    {letter:'ا', name:'alif', aname:'أَلِف', fatha:'اَ', kasra:'اِ', damma:'اُ', sf:'a', sk:'i', sd:'u'},
    {letter:'ب', name:'bay', aname:'بے', fatha:'بَ', kasra:'بِ', damma:'بُ', sf:'ba', sk:'bi', sd:'bu'},
    {letter:'پ', name:'pay', aname:'پے', fatha:'پَ', kasra:'پِ', damma:'پُ', sf:'pa', sk:'pi', sd:'pu'},
    {letter:'ت', name:'tay', aname:'تے', fatha:'تَ', kasra:'تِ', damma:'تُ', sf:'ta', sk:'ti', sd:'tu'},
    {letter:'ٹ', name:'ttay', aname:'ٹے', fatha:'ٹَ', kasra:'ٹِ', damma:'ٹُ', sf:'tta', sk:'tti', sd:'ttu'},
    {letter:'ث', name:'say', aname:'ثے', fatha:'ثَ', kasra:'ثِ', damma:'ثُ', sf:'sa', sk:'si', sd:'su'},
    {letter:'ج', name:'jeem', aname:'جِيم', fatha:'جَ', kasra:'جِ', damma:'جُ', sf:'ja', sk:'ji', sd:'ju'},
    {letter:'چ', name:'chay', aname:'چے', fatha:'چَ', kasra:'چِ', damma:'چُ', sf:'cha', sk:'chi', sd:'chu'},
    {letter:'ح', name:'hey', aname:'حے', fatha:'حَ', kasra:'حِ', damma:'حُ', sf:'ha', sk:'hi', sd:'hu'},
    {letter:'خ', name:'khay', aname:'خے', fatha:'خَ', kasra:'خِ', damma:'خُ', sf:'kha', sk:'khi', sd:'khu'},
    {letter:'د', name:'daal', aname:'دَال', fatha:'دَ', kasra:'دِ', damma:'دُ', sf:'da', sk:'di', sd:'du'},
    {letter:'ڈ', name:'ddaal', aname:'ڈال', fatha:'ڈَ', kasra:'ڈِ', damma:'ڈُ', sf:'dda', sk:'ddi', sd:'ddu'},
    {letter:'ذ', name:'zaal', aname:'ذال', fatha:'ذَ', kasra:'ذِ', damma:'ذُ', sf:'za', sk:'zi', sd:'zu'},
    {letter:'ر', name:'ray', aname:'رے', fatha:'رَ', kasra:'رِ', damma:'رُ', sf:'ra', sk:'ri', sd:'ru'},
    {letter:'ڑ', name:'rray', aname:'ڑے', fatha:'ڑَ', kasra:'ڑِ', damma:'ڑُ', sf:'rra', sk:'rri', sd:'rru'},
    {letter:'ز', name:'zay', aname:'زے', fatha:'زَ', kasra:'زِ', damma:'زُ', sf:'za', sk:'zi', sd:'zu'},
    {letter:'ژ', name:'zhay', aname:'ژے', fatha:'ژَ', kasra:'ژِ', damma:'ژُ', sf:'zha', sk:'zhi', sd:'zhu'},
    {letter:'س', name:'seen', aname:'سِين', fatha:'سَ', kasra:'سِ', damma:'سُ', sf:'sa', sk:'si', sd:'su'},
    {letter:'ش', name:'sheen', aname:'شِين', fatha:'شَ', kasra:'شِ', damma:'شُ', sf:'sha', sk:'shi', sd:'shu'},
    {letter:'ص', name:'suad', aname:'صاد', fatha:'صَ', kasra:'صِ', damma:'صُ', sf:'sa', sk:'si', sd:'su'},
    {letter:'ض', name:'zuad', aname:'ضاد', fatha:'ضَ', kasra:'ضِ', damma:'ضُ', sf:'za', sk:'zi', sd:'zu'},
    {letter:'ط', name:'toy', aname:'طوئے', fatha:'طَ', kasra:'طِ', damma:'طُ', sf:'ta', sk:'ti', sd:'tu'},
    {letter:'ظ', name:'zoy', aname:'ظوئے', fatha:'ظَ', kasra:'ظِ', damma:'ظُ', sf:'za', sk:'zi', sd:'zu'},
    {letter:'ع', name:'ain', aname:'عَيْن', fatha:'عَ', kasra:'عِ', damma:'عُ', sf:'a', sk:'i', sd:'u'},
    {letter:'غ', name:'ghain', aname:'غَيْن', fatha:'غَ', kasra:'غِ', damma:'غُ', sf:'gha', sk:'ghi', sd:'ghu'},
    {letter:'ف', name:'fay', aname:'فے', fatha:'فَ', kasra:'فِ', damma:'فُ', sf:'fa', sk:'fi', sd:'fu'},
    {letter:'ق', name:'qaaf', aname:'قَاف', fatha:'قَ', kasra:'قِ', damma:'قُ', sf:'qa', sk:'qi', sd:'qu'},
    {letter:'ک', name:'kaaf', aname:'كَاف', fatha:'کَ', kasra:'کِ', damma:'کُ', sf:'ka', sk:'ki', sd:'ku'},
    {letter:'گ', name:'gaaf', aname:'گاف', fatha:'گَ', kasra:'گِ', damma:'گُ', sf:'ga', sk:'gi', sd:'gu'},
    {letter:'ل', name:'laam', aname:'لَام', fatha:'لَ', kasra:'لِ', damma:'لُ', sf:'la', sk:'li', sd:'lu'},
    {letter:'م', name:'meem', aname:'مِيم', fatha:'مَ', kasra:'مِ', damma:'مُ', sf:'ma', sk:'mi', sd:'mu'},
    {letter:'ن', name:'noon', aname:'نُون', fatha:'نَ', kasra:'نِ', damma:'نُ', sf:'na', sk:'ni', sd:'nu'},
    {letter:'ں', name:'noon ghunna', aname:'نون غنّہ', fatha:'ں', kasra:'ں', damma:'ں', sf:'n', sk:'n', sd:'n'},
    {letter:'و', name:'wao', aname:'واؤ', fatha:'وَ', kasra:'وِ', damma:'وُ', sf:'wa', sk:'wi', sd:'wu'},
    {letter:'ہ', name:'hey', aname:'ہے', fatha:'ہَ', kasra:'ہِ', damma:'ہُ', sf:'ha', sk:'hi', sd:'hu'},
    {letter:'ھ', name:'dochashmee hey', aname:'دو چشمی ہے', fatha:'ھ', kasra:'ھ', damma:'ھ', sf:'h', sk:'h', sd:'h'},
    {letter:'ی', name:'yay', aname:'یے', fatha:'یَ', kasra:'یِ', damma:'یُ', sf:'ya', sk:'yi', sd:'yu'},
    {letter:'ے', name:'bari yay', aname:'بڑی یے', fatha:'ے', kasra:'ے', damma:'ے', sf:'ay', sk:'ay', sd:'ay'}
];

const URDU_WORDS = [
    {word:'اَب', sound:'ab', meaning:'now'},
    {word:'اِس', sound:'is', meaning:'this'},
    {word:'جَب', sound:'jab', meaning:'when'},
    {word:'سَب', sound:'sab', meaning:'all'},
    {word:'دِل', sound:'dil', meaning:'heart'},
    {word:'گُل', sound:'gul', meaning:'flower'},
    {word:'نَل', sound:'nal', meaning:'tap'},
    {word:'کَل', sound:'kal', meaning:'tomorrow'},
    {word:'پَر', sound:'par', meaning:'on/wing'},
    {word:'دو', sound:'do', meaning:'two'},
    {word:'تُو', sound:'tu', meaning:'you'},
    {word:'جو', sound:'jo', meaning:'who'},
    {word:'نَو', sound:'nau', meaning:'nine'},
    {word:'بَس', sound:'bas', meaning:'enough'},
    {word:'دَس', sound:'das', meaning:'ten'},
    {word:'مِل', sound:'mil', meaning:'meet'},
    {word:'ہَم', sound:'hum', meaning:'we'},
    {word:'تُم', sound:'tum', meaning:'you (plural)'},
    {word:'دَم', sound:'dam', meaning:'breath'},
    {word:'رَب', sound:'rab', meaning:'lord'}
];

// Arabic Letters (28 letters with harakat and connection forms)
const ARABIC_LETTERS = [
    {letter:'ا', name:'alif', aname:'أَلِف', fatha:'أَ', kasra:'إِ', damma:'أُ', sf:'a', sk:'i', sd:'u', initial:'ا', medial:'ـا', final:'ـا'},
    {letter:'ب', name:'baa', aname:'بَاء', fatha:'بَ', kasra:'بِ', damma:'بُ', sf:'ba', sk:'bi', sd:'bu', initial:'بـ', medial:'ـبـ', final:'ـب'},
    {letter:'ت', name:'taa', aname:'تَاء', fatha:'تَ', kasra:'تِ', damma:'تُ', sf:'ta', sk:'ti', sd:'tu', initial:'تـ', medial:'ـتـ', final:'ـت'},
    {letter:'ث', name:'thaa', aname:'ثَاء', fatha:'ثَ', kasra:'ثِ', damma:'ثُ', sf:'tha', sk:'thi', sd:'thu', initial:'ثـ', medial:'ـثـ', final:'ـث'},
    {letter:'ج', name:'jeem', aname:'جِيم', fatha:'جَ', kasra:'جِ', damma:'جُ', sf:'ja', sk:'ji', sd:'ju', initial:'جـ', medial:'ـجـ', final:'ـج'},
    {letter:'ح', name:'haa', aname:'حَاء', fatha:'حَ', kasra:'حِ', damma:'حُ', sf:'ha', sk:'hi', sd:'hu', initial:'حـ', medial:'ـحـ', final:'ـح'},
    {letter:'خ', name:'khaa', aname:'خَاء', fatha:'خَ', kasra:'خِ', damma:'خُ', sf:'kha', sk:'khi', sd:'khu', initial:'خـ', medial:'ـخـ', final:'ـخ'},
    {letter:'د', name:'daal', aname:'دَال', fatha:'دَ', kasra:'دِ', damma:'دُ', sf:'da', sk:'di', sd:'du', initial:'د', medial:'ـد', final:'ـد'},
    {letter:'ذ', name:'dhaal', aname:'ذَال', fatha:'ذَ', kasra:'ذِ', damma:'ذُ', sf:'dha', sk:'dhi', sd:'dhu', initial:'ذ', medial:'ـذ', final:'ـذ'},
    {letter:'ر', name:'raa', aname:'رَاء', fatha:'رَ', kasra:'رِ', damma:'رُ', sf:'ra', sk:'ri', sd:'ru', initial:'ر', medial:'ـر', final:'ـر'},
    {letter:'ز', name:'zaay', aname:'زَاي', fatha:'زَ', kasra:'زِ', damma:'زُ', sf:'za', sk:'zi', sd:'zu', initial:'ز', medial:'ـز', final:'ـز'},
    {letter:'س', name:'seen', aname:'سِين', fatha:'سَ', kasra:'سِ', damma:'سُ', sf:'sa', sk:'si', sd:'su', initial:'سـ', medial:'ـسـ', final:'ـس'},
    {letter:'ش', name:'sheen', aname:'شِين', fatha:'شَ', kasra:'شِ', damma:'شُ', sf:'sha', sk:'shi', sd:'shu', initial:'شـ', medial:'ـشـ', final:'ـش'},
    {letter:'ص', name:'saad', aname:'صَاد', fatha:'صَ', kasra:'صِ', damma:'صُ', sf:'sa', sk:'si', sd:'su', initial:'صـ', medial:'ـصـ', final:'ـص'},
    {letter:'ض', name:'daad', aname:'ضَاد', fatha:'ضَ', kasra:'ضِ', damma:'ضُ', sf:'da', sk:'di', sd:'du', initial:'ضـ', medial:'ـضـ', final:'ـض'},
    {letter:'ط', name:'taa', aname:'طَاء', fatha:'طَ', kasra:'طِ', damma:'طُ', sf:'ta', sk:'ti', sd:'tu', initial:'طـ', medial:'ـطـ', final:'ـط'},
    {letter:'ظ', name:'dhaa', aname:'ظَاء', fatha:'ظَ', kasra:'ظِ', damma:'ظُ', sf:'dha', sk:'dhi', sd:'dhu', initial:'ظـ', medial:'ـظـ', final:'ـظ'},
    {letter:'ع', name:'ain', aname:'عَيْن', fatha:'عَ', kasra:'عِ', damma:'عُ', sf:'a', sk:'i', sd:'u', initial:'عـ', medial:'ـعـ', final:'ـع'},
    {letter:'غ', name:'ghain', aname:'غَيْن', fatha:'غَ', kasra:'غِ', damma:'غُ', sf:'gha', sk:'ghi', sd:'ghu', initial:'غـ', medial:'ـغـ', final:'ـغ'},
    {letter:'ف', name:'faa', aname:'فَاء', fatha:'فَ', kasra:'فِ', damma:'فُ', sf:'fa', sk:'fi', sd:'fu', initial:'فـ', medial:'ـفـ', final:'ـف'},
    {letter:'ق', name:'qaaf', aname:'قَاف', fatha:'قَ', kasra:'قِ', damma:'قُ', sf:'qa', sk:'qi', sd:'qu', initial:'قـ', medial:'ـقـ', final:'ـق'},
    {letter:'ك', name:'kaaf', aname:'كَاف', fatha:'كَ', kasra:'كِ', damma:'كُ', sf:'ka', sk:'ki', sd:'ku', initial:'كـ', medial:'ـكـ', final:'ـك'},
    {letter:'ل', name:'laam', aname:'لَام', fatha:'لَ', kasra:'لِ', damma:'لُ', sf:'la', sk:'li', sd:'lu', initial:'لـ', medial:'ـلـ', final:'ـل'},
    {letter:'م', name:'meem', aname:'مِيم', fatha:'مَ', kasra:'مِ', damma:'مُ', sf:'ma', sk:'mi', sd:'mu', initial:'مـ', medial:'ـمـ', final:'ـم'},
    {letter:'ن', name:'noon', aname:'نُون', fatha:'نَ', kasra:'نِ', damma:'نُ', sf:'na', sk:'ni', sd:'nu', initial:'نـ', medial:'ـنـ', final:'ـن'},
    {letter:'ه', name:'haa', aname:'هَاء', fatha:'هَ', kasra:'هِ', damma:'هُ', sf:'ha', sk:'hi', sd:'hu', initial:'هـ', medial:'ـهـ', final:'ـه'},
    {letter:'و', name:'waaw', aname:'وَاو', fatha:'وَ', kasra:'وِ', damma:'وُ', sf:'wa', sk:'wi', sd:'wu', initial:'و', medial:'ـو', final:'ـو'},
    {letter:'ي', name:'yaa', aname:'يَاء', fatha:'يَ', kasra:'يِ', damma:'يُ', sf:'ya', sk:'yi', sd:'yu', initial:'يـ', medial:'ـيـ', final:'ـي'}
];

const ARABIC_2LETTER = [
    {word:'أَبْ', sound:'ab', meaning:'father'},
    {word:'أُمْ', sound:'um', meaning:'mother'},
    {word:'يَدْ', sound:'yad', meaning:'hand'},
    {word:'فَمْ', sound:'fam', meaning:'mouth'},
    {word:'مَنْ', sound:'man', meaning:'who'},
    {word:'عَنْ', sound:'an', meaning:'about'},
    {word:'إِنْ', sound:'in', meaning:'if'},
    {word:'بَلْ', sound:'bal', meaning:'rather'},
    {word:'قَدْ', sound:'qad', meaning:'already'},
    {word:'هَلْ', sound:'hal', meaning:'is it?'}
];

const ARABIC_3LETTER = [
    {word:'كَتَبَ', sound:'kataba', meaning:'he wrote'},
    {word:'عَلِمَ', sound:'alima', meaning:'he knew'},
    {word:'فَتَحَ', sound:'fataha', meaning:'he opened'},
    {word:'جَلَسَ', sound:'jalasa', meaning:'he sat'},
    {word:'ذَهَبَ', sound:'dhahaba', meaning:'he went'},
    {word:'نَظَرَ', sound:'nadhara', meaning:'he looked'},
    {word:'سَمِعَ', sound:'samia', meaning:'he heard'},
    {word:'قَرَأَ', sound:'qaraa', meaning:'he read'},
    {word:'وَلَدْ', sound:'walad', meaning:'boy'},
    {word:'بِنْتْ', sound:'bint', meaning:'girl'}
];