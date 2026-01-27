# GitHub Self-Hosted Runner Setup

This directory contains Docker configuration for running a self-hosted GitHub Actions runner on Linux.

## Prerequisites

- Docker and Docker Compose installed
- - GitHub repository with Actions enabled
  - - Administrator access to the repository
   
    - ## Quick Start
   
    - ### Step 1: Generate Runner Token
   
    - 1. Navigate to your repository: https://github.com/BrianCLong/summit
      2. 2. Go to **Settings > Actions > Runners**
         3. 3. Click **New self-hosted runner**
            4. 4. Select **Linux** and appropriate architecture
               5. 5. Copy the runner token from the configuration instructions
                 
                  6. ### Step 2: Configure Environment
                 
                  7. ```bash
                     cd infra/runner
                     cp .env.example .env
                     ```

                     Edit `.env` and paste your runner token:

                     ```bash
                     RUNNER_TOKEN=paste_your_token_here
                     RUNNER_NAME=my-linux-runner-1
                     ```

                     ### Step 3: Start the Runner

                     ```bash
                     docker-compose up -d
                     ```

                     The runner will automatically register with GitHub and appear in your Runners list.

                     ### Step 4: Verify Runner Status

                     ```bash
                     # Check container logs
                     docker-compose logs -f

                     # See registered runners
                     # Go to: Settings > Actions > Runners
                     ```

                     ## Usage in Workflows

                     Use the runner in your GitHub Actions workflows:

                     ```yaml
                     jobs:
                       preview-deploy:
                         runs-on: [self-hosted, linux, preview]
                         steps:
                           - uses: actions/checkout@v4
                           - name: Deploy preview
                             run: ./scripts/preview/deploy.sh ${{ github.event.pull_request.number }}
                     ```

                     ## Runner Labels

                     The runner is configured with these labels:
                     - `self-hosted` - Indicates it's a self-hosted runner
                     - - `linux` - Operating system
                       - - `preview` - Use case/purpose
                         - - `docker` - Docker support enabled
                          
                           - ## Environment Variables
                          
                           - ### Required
                           - - `RUNNER_TOKEN` - GitHub runner authentication token
                            
                             - ### Optional
                             - - `RUNNER_NAME` - Display name for the runner (default: summit-runner-1)
                               - - `RUNNER_LABELS` - Comma-separated labels (default: self-hosted,linux,preview,docker)
                                 - - `RUNNER_GROUP_NAME` - Runner group name (default: Preview)
                                   - - `DOCKER_IN_DOCKER` - Enable Docker-in-Docker (default: true)
                                    
                                     - ## Managing the Runner
                                    
                                     - ### View Logs
                                     - ```bash
                                       docker-compose logs -f runner
                                       ```

                                       ### Stop the Runner
                                       ```bash
                                       docker-compose down
                                       ```

                                       ### Remove and Re-register
                                       ```bash
                                       docker-compose down
                                       rm -rf ./runner
                                       docker-compose up -d
                                       ```

                                       ## Troubleshooting

                                       ### Runner Not Appearing in Settings
                                       - Check token is correct: `docker-compose logs runner | grep -i token`
                                       - - Verify runner is connecting: `docker-compose ps`
                                         - - Check firewall/network connectivity
                                          
                                           - ### Docker-in-Docker Not Working
                                           - - Ensure Docker daemon is accessible: `docker ps`
                                             - - Check volume mount: `docker exec summit-github-runner docker ps`
                                               - - Verify `/var/run/docker.sock` permissions
                                                
                                                 - ### Runner Offline After Restart
                                                 - - Ensure `.env` file exists and has valid token
                                                   - - Check: `docker-compose logs runner`
                                                     - - Verify GitHub network connectivity
                                                      
                                                       - ## Performance Tuning
                                                      
                                                       - ### Resource Limits
                                                       - Add to `docker-compose.yml` under `runner` service:
                                                      
                                                       - ```yaml
                                                         deploy:
                                                           resources:
                                                             limits:
                                                               cpus: '4'
                                                               memory: 4G
                                                                   reservations:
                                                               cpus: '2'
                                                               memory: 2G
                                                         ```

                                                         ### Scaling Multiple Runners
                                                         For multiple runners, create separate directories:

                                                         ```bash
                                                         mkdir runner-1 runner-2
                                                         cp infra/runner/{docker-compose.yml,.env.example} runner-1/
                                                         cp infra/runner/{docker-compose.yml,.env.example} runner-2/

                                                         # Configure each with unique token and name
                                                         # Then start both
                                                         cd runner-1 && docker-compose up -d
                                                         cd ../runner-2 && docker-compose up -d
                                                         ```

                                                         ## Security Best Practices

                                                         1. **Token Management**
                                                         2.    - Never commit `.env` file to version control
                                                               -    - Store tokens in secure secret management
                                                                    -    - Rotate tokens regularly
                                                                     
                                                                         - 2. **Network Security**
                                                                           3.    - Use firewall rules to restrict runner access
                                                                                 -    - Run in isolated network segment if possible
                                                                                      -    - Monitor runner activity in GitHub Settings
                                                                                       
                                                                                           - 3. **Container Security**
                                                                                             4.    - Regularly update base image: `docker pull myoung34/github-runner:latest`
                                                                                                   -    - Review image security: `docker scan summit-github-runner`
                                                                                                        -    - Limit container capabilities as needed
                                                                                                         
                                                                                                             - ## Advanced Configuration
                                                                                                         
                                                                                                             - ### Custom Base Image
                                                                                                             - Modify `docker-compose.yml`:
                                                                                                         
                                                                                                             - ```yaml
                                                                                                               image: myoung34/github-runner:ubuntu-focal
                                                                                                               ```
                                                                                                               
                                                                                                               Available tags:
                                                                                                               - `latest` - Latest Ubuntu LTS
                                                                                                               - - `ubuntu-focal` - Ubuntu 20.04
                                                                                                                 - - `ubuntu-jammy` - Ubuntu 22.04
                                                                                                                  
                                                                                                                   - ### Network Configuration
                                                                                                                   - For runners that need to access private resources:
                                                                                                                  
                                                                                                                   - ```yaml
                                                                                                                     networks:
                                                                                                                       summit-network:
                                                                                                                         driver: bridge
                                                                                                                     ```
                                                                                                                     
                                                                                                                     ## Documentation
                                                                                                                     
                                                                                                                     - [GitHub Actions Documentation](https://docs.github.com/en/actions)
                                                                                                                     - - [Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)
                                                                                                                       - - [GitHub Runner Image](https://github.com/myoung34/docker-github-actions-runner)
                                                                                                                        
                                                                                                                         - ## Support
                                                                                                                        
                                                                                                                         - For issues with the runner:
                                                                                                                         - 1. Check logs: `docker-compose logs runner`
                                                                                                                           2. 2. Verify configuration in `.env`
                                                                                                                           3. Ensure GitHub connectivity
                                                                                                                           4. 4. Review GitHub Actions logs in repository
                                                                                                                             
                                                                                                                              5. ## Related Documentation
                                                                                                                             
                                                                                                                              6. - See `docs/devops/preview-environments.md` for PR preview pipeline setup
                                                                                                                                 - - See `scripts/preview/` for automation scripts
                                                                                                                                   - - See `.github/workflows/` for workflow configurations
