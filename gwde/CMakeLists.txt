cmake_minimum_required(VERSION 3.16)
project(gwde LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(gwde STATIC
    src/watermark.cpp
)

target_include_directories(gwde
    PUBLIC
        ${PROJECT_SOURCE_DIR}/include
)

find_package(Python COMPONENTS Interpreter Development.Module OPTIONAL_COMPONENTS Development REQUIRED)
find_package(pybind11 CONFIG QUIET)

if(pybind11_FOUND)
    pybind11_add_module(_gwde MODULE
        bindings/python_module.cpp
    )
    target_link_libraries(_gwde PRIVATE gwde)
    target_include_directories(_gwde PRIVATE ${PROJECT_SOURCE_DIR}/include)
    target_compile_features(_gwde PRIVATE cxx_std_17)
endif()

