// Default texts used for seeding and as a fallback when the DB is offline.
module.exports = [
  {
    title: 'Слова',
    lang: 'ru',
    level: 'easy',
    content: 'солнце светит ярко и согревает землю своим теплом вокруг зеленеет трава и цветут прекрасные цветы в лесу поют птицы и шуршат сухие листья под ногами маленькая белка прыгает по веткам старого дуба и прячет орехи на зиму быстрый ручей бежит по камням и весело журчит на траве блестит утренняя роса мир вокруг кажется огромным и полным тайн каждый день приносит что-то новое и интересное нужно просто уметь замечать красоту в простых вещах книга на столе ждет своего читателя а чашка горячего чая приятно согревает руки вечер медленно опускается на город и зажигает первые огни в окнах домов наступает время для отдыха и приятных мыслей'
  },
  {
    title: 'Текст',
    lang: 'ru',
    level: 'medium',
    content: 'Корабль «Пегас» опустился на планету-пустыню. Вокруг, до самого горизонта, простирались только серые пески и редкие острые скалы. Профессор Селезнев и его дочь Алиса вышли на наружную платформу, чтобы осмотреться. Корабль должен был простоять здесь до вечера, и Алиса надеялась найти что-то необычное. Вдруг в глубокой лощине между скалами она заметила странное движение. Это не было животное или птица. Из песка медленно поднимались зеленые побеги с толстыми листьями. Они шевелились, словно искали воду или тепло. Алиса сделала шаг вперед, но отец резко схватил ее за руку и приказал стоять на месте. В этот момент один из кустиков оторвал свои корни от земли и, медленно переставляя их, как маленькие ножки, направился прямо к кораблю. Другие кусты последовали за ним. Они окружали платформу все плотнее и плотнее, издавая тихий свист. Алиса испуганно прижалась к отцу, а самый большой куст уже поднял свои ветки и коснулся края железного трапа...'
  },
  {
    title: 'Words',
    lang: 'en',
    level: 'easy',
    content: 'every morning young children go to school to learn new things and meet friends they carry heavy backpacks with notebooks and colorful pens inside the classroom the teacher talks about world history and shows interesting maps during the lunch break boys and girls run outside to the schoolyard they eat apples and talk about video games or favorite films some students like to play football on the green grass while others prefer to sit quietly and draw pictures time flies fast when you are busy after the final bell everyone goes home to ride a bicycle or walk with a family dog.'
  },
  {
    title: 'Text',
    lang: 'en',
    level: 'medium',
    content: 'Wendy and her brothers, John and Michael, were sleeping quietly in their warm beds. The room was dark, but the night sky outside the window was full of bright stars. Suddenly, the window opened with a soft sound. A small light, like a tiny star, flew into the nursery. It was a beautiful fairy named Tinker Bell. Right behind her came a strange boy who could fly. His name was Peter Pan, the boy who never grew up. He was looking for his lost shadow. Wendy woke up and saw him. She was surprised but not scared. Peter told her about Neverland, a magical island where children have amazing adventures and never go to school. He asked Wendy and her brothers to fly away with him. Wendy wanted to go, but she did not know how to fly. Peter smiled and said that it was very easy. You just need some fairy dust and happy thoughts.'
  },
  {
    title: 'Unity',
    lang: 'en',
    level: 'hard',
    content: '[SerializeField] _moveSpeed = 5.5f; Input.GetAxisRaw("Horizontal"); => { _rb2D } void Update() != 0 && true; GetComponent<Rigidbody2D>(); public int inventorySlots = new int; Vector2 velocity == new Vector2(moveInput * _moveSpeed, _rb2D.linearVelocity.y); float moveInput; else if (moveInput == 0 && !isJumping) { _rb2D.linearVelocity = Vector3.zero; } transform.position += System.Array.Find(inventorySlots, x => x > 0) == 1 ? Vector3.up : Vector2.zero; Debug.LogError("Rigidbody2D component is missing!"); using UnityEngine; using System.Collections; public class PlayerController : MonoBehaviour { private Rigidbody2D _rb2D; [SerializeField] private KeyCode _jumpKey = KeyCode.Space; void Start() bool isJumping = Input.GetKeyDown(_jumpKey); inventorySlots += 1; if (_rb2D == null) x => x > 0 } Vector2 velocity = new Vector2(moveInput * _moveSpeed, _rb2D.linearVelocity.y); if (moveInput != 0 && isJumping == true)'
  },
  {
    title: 'Java',
    lang: 'en',
    level: 'hard',
    content: '@Override public Optional<UserDto> findById(Long id) { return; } public class UserService implements BaseService<UserDto, Long> { private final UserRepository userRepository; @Autowired public UserService(UserRepository userRepository) { this.userRepository = userRepository; } List<String> list = names.stream().filter(name -> !name.isEmpty()).map(String::toUpperCase).collect(Collectors.toList()); try { System.out.println("Processing data..."); throw new IllegalArgumentException("Invalid ID: " + id); } catch (Exception e) { log.error("Error occurred!", e); } Map<Integer, User> userMap = new HashMap<>(); for (int i = 0; i < list.size(); i++) { userMap.put(i, new User(list.get(i))); } public static final String API_URL = "https://example.com"; @RestController @RequestMapping("/api/v1/users") public class UserController { @GetMapping("/{id}") public ResponseEntity<UserDto> getUser(@PathVariable Long id) { return ResponseEntity.ok().body(service.findById(id)); } }'
  },
  {
    title: 'C++',
    lang: 'en',
    level: 'hard',
    content: '#define LED_PIN 13 #define POT_PIN A0 const int threshold = 512; unsigned long previousMillis = 0; const long interval = 1000; void setup() { Serial.begin(9600); pinMode(LED_PIN, OUTPUT); pinMode(2, INPUT_PULLUP); attachInterrupt(digitalPinToInterrupt(2), blink, RISING); } void loop() { int sensorValue = analogRead(POT_PIN); float voltage = sensorValue * (5.0 / 1023.0); if (sensorValue >= threshold && voltage != 0.0) { digitalWrite(LED_PIN, HIGH); Serial.print("Warning! Value: "); Serial.println(sensorValue); } else if (sensorValue < 200 || !digitalRead(2)) { digitalWrite(LED_PIN, LOW); } unsigned long currentMillis = millis(); if (currentMillis - previousMillis >= interval) { previousMillis = currentMillis; byte data = 0b10101010; for (int i = 0; i < 8; i++) { bool bitStatus = (data >> i) & 1; Serial.print(bitStatus ? \'1\' : \'0\'); } } delay(50); }'
  },
  {
    title: 'HTML',
    lang: 'en',
    level: 'hard',
    content: '<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>A & B &copy; 2026</title> <link rel="stylesheet" href="./css/main.min.css?v=2.1"> </head> <body> <header id="main-header" class="flex items-center justify-between px-4 py-2"> <a href="/" class="logo_link"><img src="img/logo.svg" alt="Company Logo" width="120" height="auto" /></a> <nav class="menu_nav"> <ul class="menu_list"> <li class="menu_item active"><a href="#home">Home</a></li> <li class="menu_item"><a href="https://example.com" target="_blank" rel="noopener noreferrer">Shop &rarr;</a></li> </ul> </nav> </header> <main class="content_grid"> <section class="hero_section" data-aos="fade-up"> <h1 class="title-xl">Hello, <span>World!</span></h1> <p class="text-lead">Current balance: &nbsp; <strong>$1,250.00</strong></p> <form action="/api/v1/submit" method="POST" id="authForm"> <input type="email" name="user_email" placeholder="name@domain.com" required="required" disabled /> <button type="submit" class="btn btn--primary">Sign Up </button> </form> </section> </main> </body> </html>'
  },
  {
    title: 'JavaScript',
    lang: 'en',
    level: 'hard',
    content: 'import { useState, useEffect } from "react"; const API_KEY = process.env.NEXT_PUBLIC_TOKEN || "default_id"; export default function useFetchData(url, delay = 500) { const [data, setData] = useState([]); const [error, setError] = useState(null); useEffect(() => { const fetchData = async () => { try { const response = await fetch(`${url}?key=${API_KEY}`); if (!response.ok || response.status === 404) { throw new Error(`HTTP error! status: ${response.status}`); } const json = await response.json(); const filtered = json.filter(item => item.id !== null && item.value % 2 === 0); setData(prev => [...prev, ...filtered]); } catch (err) { setError(err.message ?? "Unknown error"); console.error(`[Fetch Error]: ${err}`); } }; const timer = setTimeout(() => fetchData(), delay); return () => clearTimeout(timer); }, [url, delay]); return { data, error }; } const targetNode = document.querySelector("#app .container > div");'
  }
];
