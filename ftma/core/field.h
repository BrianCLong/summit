#pragma once

#include <cstdint>

namespace ftma {

class Field {
 public:
  static constexpr std::uint64_t kModulus = 2305843009213693951ULL;  // 2^61 - 1

  static std::uint64_t Add(std::uint64_t a, std::uint64_t b) {
    unsigned __int128 sum = static_cast<unsigned __int128>(a) +
                            static_cast<unsigned __int128>(b);
    return static_cast<std::uint64_t>(sum % kModulus);
  }

  static std::uint64_t Sub(std::uint64_t a, std::uint64_t b) {
    unsigned __int128 base = static_cast<unsigned __int128>(kModulus) + a;
    unsigned __int128 diff = base - static_cast<unsigned __int128>(b % kModulus);
    return static_cast<std::uint64_t>(diff % kModulus);
  }

  static std::uint64_t Mul(std::uint64_t a, std::uint64_t b) {
    unsigned __int128 prod = static_cast<unsigned __int128>(a) *
                             static_cast<unsigned __int128>(b);
    return static_cast<std::uint64_t>(prod % kModulus);
  }

  static std::uint64_t Pow(std::uint64_t base, std::uint64_t exp) {
    std::uint64_t result = 1ULL;
    std::uint64_t cur = base % kModulus;
    while (exp > 0) {
      if (exp & 1ULL) {
        result = Mul(result, cur);
      }
      cur = Mul(cur, cur);
      exp >>= 1ULL;
    }
    return result;
  }

  static std::uint64_t Inverse(std::uint64_t value) {
    if (value == 0ULL) {
      return 0ULL;
    }
    return Pow(value, kModulus - 2ULL);
  }

  static int64_t ToSigned(std::uint64_t value) {
    if (value > kModulus / 2ULL) {
      return static_cast<int64_t>(value) - static_cast<int64_t>(kModulus);
    }
    return static_cast<int64_t>(value);
  }

  static std::uint64_t FromSigned(int64_t value) {
    int64_t mod = static_cast<int64_t>(kModulus);
    int64_t adjusted = ((value % mod) + mod) % mod;
    return static_cast<std::uint64_t>(adjusted);
  }
};

}  // namespace ftma
