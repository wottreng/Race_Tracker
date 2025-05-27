pipeline {
    agent any

    environment {
        CI = 'true'
    }

    stages {

        stage('Checkout current branch') {
            steps {
                sh '''
                    git config user.name "ci-bot"
                    git config user.email "ci-bot@example.com"
                    git remote set-url origin git@github.com:wottreng/Race_Tracker.git
                    branch="${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD)}"
                    git checkout -B "$branch"
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Code Coverage') {
            steps {
                sh 'npm test -- --coverage'
            }
            post {
                success {
                    publishHTML(target: [
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

       stage('Update and Push Service Worker') {
                      when {
                          allOf {
                              changeRequest()
                          }
                      }
                      steps {
                          sh '''
                          sed -i "s/^const cacheVersion = '.*';/const cacheVersion = '$(date +%s)';/" sw.js
                          if [ -n "$(git diff sw.js)" ]; then
                            branch="${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD)}"
                            git add sw.js
                            git commit -m "chore: update cacheVersion in sw.js [ci skip]"
                            git push origin "$branch"
                            echo 'Service worker updated and pushed successfully.'
                          fi
                          '''
                      }
                  }

        stage('Main Branch Deployment') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying to production...'
                sh '/server/tracker_sync_with_main.sh'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
        always {
            cleanWs()
        }
    }
}