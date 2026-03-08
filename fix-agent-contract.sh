#!/bin/bash
sed -i 's/ignorePath: "\\\\.sh$"/ignorePath: "\\\\.sh$$"/g' agent-contract.json
