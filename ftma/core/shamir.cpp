#include "shamir.h"

#include <stdexcept>

namespace ftma {

namespace {

std::vector<std::uint64_t> BuildPolynomial(std::uint64_t constant,
                                           std::size_t degree,
                                           std::mt19937_64& prng) {
  std::vector<std::uint64_t> coeffs(degree + 1);
  coeffs[0] = constant;
  std::uniform_int_distribution<std::uint64_t> dist(0, Field::kModulus - 1ULL);
  for (std::size_t i = 1; i <= degree; ++i) {
    coeffs[i] = dist(prng);
  }
  return coeffs;
}

std::uint64_t Evaluate(const std::vector<std::uint64_t>& coeffs,
                       std::uint64_t x) {
  std::uint64_t result = 0ULL;
  std::uint64_t power = 1ULL;
  for (std::size_t i = 0; i < coeffs.size(); ++i) {
    std::uint64_t term = Field::Mul(coeffs[i], power);
    result = Field::Add(result, term);
    power = Field::Mul(power, x % Field::kModulus);
  }
  return result;
}

}  // namespace

std::vector<std::vector<std::uint64_t>> Shamir::ShareVector(
    const std::vector<std::uint64_t>& secret, std::mt19937_64& prng) const {
  if (threshold_ == 0 || threshold_ > num_participants_) {
    throw std::invalid_argument("Invalid Shamir threshold");
  }
  std::vector<std::vector<std::uint64_t>> shares(num_participants_,
                                                 std::vector<std::uint64_t>(secret.size(), 0ULL));
  for (std::size_t component = 0; component < secret.size(); ++component) {
    std::vector<std::uint64_t> coeffs =
        BuildPolynomial(secret[component], threshold_ - 1, prng);
    for (std::size_t participant = 0; participant < num_participants_; ++participant) {
      std::uint64_t x = static_cast<std::uint64_t>(participant + 1);
      shares[participant][component] = Evaluate(coeffs, x);
    }
  }
  return shares;
}

std::vector<std::uint64_t> Shamir::Reconstruct(
    const std::vector<std::uint64_t>& x_coords,
    const std::vector<std::vector<std::uint64_t>>& shares) const {
  if (shares.size() != x_coords.size()) {
    throw std::invalid_argument("Share and coordinate sizes differ");
  }
  if (shares.size() < threshold_) {
    throw std::invalid_argument("Insufficient shares to reconstruct secret");
  }
  std::size_t vector_size = shares[0].size();
  std::vector<std::uint64_t> secret(vector_size, 0ULL);
  for (std::size_t comp = 0; comp < vector_size; ++comp) {
    std::uint64_t value = 0ULL;
    for (std::size_t i = 0; i < shares.size(); ++i) {
      std::uint64_t numerator = 1ULL;
      std::uint64_t denominator = 1ULL;
      for (std::size_t j = 0; j < shares.size(); ++j) {
        if (i == j) {
          continue;
        }
        std::uint64_t xi = x_coords[i] % Field::kModulus;
        std::uint64_t xj = x_coords[j] % Field::kModulus;
        numerator = Field::Mul(numerator, Field::Sub(0ULL, xj));
        denominator = Field::Mul(denominator, Field::Sub(xi, xj));
      }
      std::uint64_t lagrange =
          Field::Mul(numerator, Field::Inverse(denominator));
      value = Field::Add(value, Field::Mul(shares[i][comp], lagrange));
    }
    secret[comp] = value;
  }
  return secret;
}

}  // namespace ftma
