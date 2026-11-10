// Nội dung gốc do dự án tự sáng tác cho English Garden.
// Không sao chép đề, logo hay dữ liệu từ IOE. Đây là từ vựng lớp 2 phổ thông.

export interface WordItem {
  en: string;
  vi: string;
  asset?: string; // SVG trong /illustrations (nếu có)
  alt?: string; // mô tả truy cập cho tranh
}

// Từ vựng theo chủ đề.
export const WORDS: Record<string, WordItem[]> = {
  animals: [
    { en: "cat", vi: "con mèo", asset: "/illustrations/cat.svg", alt: "Con mèo màu cam" },
    { en: "dog", vi: "con chó", asset: "/illustrations/dog.svg", alt: "Con chó màu nâu" },
    { en: "bird", vi: "con chim", asset: "/illustrations/bird.svg", alt: "Con chim màu xanh" },
    { en: "fish", vi: "con cá", asset: "/illustrations/fish.svg", alt: "Con cá màu cam" },
    { en: "duck", vi: "con vịt", asset: "/illustrations/duck.svg", alt: "Con vịt màu vàng" },
    { en: "frog", vi: "con ếch", asset: "/illustrations/frog.svg", alt: "Con ếch màu xanh lá" },
  ],
  food: [
    { en: "rice", vi: "cơm", asset: "/illustrations/rice.svg", alt: "Một bát cơm trắng" },
    { en: "bread", vi: "bánh mì", asset: "/illustrations/bread.svg", alt: "Một ổ bánh mì" },
    { en: "banana", vi: "quả chuối", asset: "/illustrations/banana.svg", alt: "Một quả chuối vàng" },
    { en: "milk", vi: "sữa", asset: "/illustrations/milk.svg", alt: "Một hộp sữa" },
    { en: "apple", vi: "quả táo", asset: "/illustrations/apple.svg", alt: "Một quả táo đỏ" },
    { en: "egg", vi: "quả trứng", asset: "/illustrations/egg.svg", alt: "Một quả trứng" },
  ],
  "school-things": [
    { en: "pen", vi: "bút mực", asset: "/illustrations/pen.svg", alt: "Một cây bút mực màu xanh" },
    { en: "pencil", vi: "bút chì", asset: "/illustrations/pencil.svg", alt: "Một cây bút chì vàng" },
    { en: "ruler", vi: "thước kẻ", asset: "/illustrations/ruler.svg", alt: "Một cây thước kẻ vàng" },
    { en: "bag", vi: "cặp sách", asset: "/illustrations/bag.svg", alt: "Một chiếc cặp sách đỏ" },
    { en: "book", vi: "quyển sách", asset: "/illustrations/book.svg", alt: "Một quyển sách xanh" },
  ],
  colors: [
    { en: "green", vi: "màu xanh lá", asset: "/illustrations/colour-green.svg", alt: "Hình tròn màu xanh lá" },
    { en: "yellow", vi: "màu vàng", asset: "/illustrations/colour-yellow.svg", alt: "Hình tròn màu vàng" },
    { en: "blue", vi: "màu xanh dương", asset: "/illustrations/colour-blue.svg", alt: "Hình tròn màu xanh dương" },
    { en: "red", vi: "màu đỏ", asset: "/illustrations/colour-red.svg", alt: "Hình tròn màu đỏ" },
    { en: "orange", vi: "màu cam", asset: "/illustrations/colour-orange.svg", alt: "Hình tròn màu cam" },
    { en: "pink", vi: "màu hồng", asset: "/illustrations/colour-pink.svg", alt: "Hình tròn màu hồng" },
  ],
  family: [
    { en: "mother", vi: "mẹ" },
    { en: "father", vi: "bố" },
    { en: "sister", vi: "chị/em gái" },
    { en: "brother", vi: "anh/em trai" },
    { en: "baby", vi: "em bé" },
    { en: "grandmother", vi: "bà" },
  ],
  alphabet: [
    { en: "A", vi: "chữ A" },
    { en: "B", vi: "chữ B" },
    { en: "C", vi: "chữ C" },
    { en: "D", vi: "chữ D" },
    { en: "E", vi: "chữ E" },
    { en: "F", vi: "chữ F" },
    { en: "G", vi: "chữ G" },
  ],
  numbers: [
    { en: "one", vi: "số 1" },
    { en: "two", vi: "số 2" },
    { en: "three", vi: "số 3" },
    { en: "four", vi: "số 4" },
    { en: "five", vi: "số 5" },
    { en: "ten", vi: "số 10" },
    { en: "twenty", vi: "số 20" },
  ],
};
