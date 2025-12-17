cmake_minimum_required(VERSION 3.18)
project(ftma LANGUAGES CXX)

find_package(pybind11 CONFIG REQUIRED)

set(FTMA_CORE_SOURCES
    ../core/protocol.cpp
    ../core/shamir.cpp
)

pybind11_add_module(ftma_core bindings.cpp ${FTMA_CORE_SOURCES})

target_include_directories(ftma_core
    PRIVATE
      ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_features(ftma_core PRIVATE cxx_std_17)

install(TARGETS ftma_core LIBRARY DESTINATION .)
