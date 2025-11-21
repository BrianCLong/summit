#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "../core/protocol.h"

namespace py = pybind11;

PYBIND11_MODULE(ftma_core, m) {
  py::class_<ftma::AggregationResult>(m, "AggregationResult")
      .def_readonly("sum", &ftma::AggregationResult::sum)
      .def_readonly("mean", &ftma::AggregationResult::mean)
      .def_readonly("variance", &ftma::AggregationResult::variance)
      .def_readonly("participants", &ftma::AggregationResult::participants)
      .def_readonly("survivors", &ftma::AggregationResult::survivors)
      .def_readonly("threshold", &ftma::AggregationResult::threshold);

  py::class_<ftma::FtmaCoordinator>(m, "FtmaCoordinator")
      .def(py::init<std::size_t, std::size_t, std::size_t, std::uint64_t>(),
           py::arg("num_clients"), py::arg("threshold"),
           py::arg("metric_dimension"), py::arg("scale") = 1000000ULL)
      .def("register_client", &ftma::FtmaCoordinator::RegisterClient,
           py::arg("client_id"), py::arg("metrics"))
      .def("finalize", &ftma::FtmaCoordinator::Finalize,
           py::arg("active_clients"))
      .def_property_readonly("dimension", &ftma::FtmaCoordinator::dimension);
}
