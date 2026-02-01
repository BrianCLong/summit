import json
import random

def generate_line(n=64):
    points = []
    for i in range(n):
        x = i * 1.0
        points.append([x, 0.0, 0.0])
    return points

def generate_plane(n=64):
    points = []
    side = int(n**0.5)
    for i in range(side):
        for j in range(side):
            points.append([float(i), float(j), 0.0])
    return points

if __name__ == "__main__":
    with open("tests/fixtures/pointclouds/line.json", "w") as f:
        json.dump(generate_line(), f)
    with open("tests/fixtures/pointclouds/plane.json", "w") as f:
        json.dump(generate_plane(), f)
