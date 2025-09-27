#pragma once

#include <cstddef>
#include <cstdint>
#include <random>
#include <utility>
#include <vector>

#include "field.h"

namespace ftma {

class Shamir {
 public:
  Shamir(std::size_t threshold, std::size_t num_participants)
      : threshold_(threshold), num_participants_(num_participants) {}

  std::vector<std::vector<std::uint64_t>> ShareVector(
      const std::vector<std::uint64_t>& secret, std::mt19937_64& prng) const;

  std::vector<std::uint64_t> Reconstruct(
      const std::vector<std::uint64_t>& x_coords,
      const std::vector<std::vector<std::uint64_t>>& shares) const;

 private:
  std::size_t threshold_;
  std::size_t num_participants_;
};

}  // namespace ftma
