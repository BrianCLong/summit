#!/bin/bash
qemu-system-x86_64 -m 2048 -enable-kvm -drive file=test.qcow2,format=qcow2
