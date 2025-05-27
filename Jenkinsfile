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
                    git checkout "${CHANGE_BRANCH}"
                '''
            }
        }

        stage('Debug Environment Variables') {
            steps {
                script {
                    echo "CHANGE_ID: ${env.CHANGE_ID ?: 'null'}"
                    echo "BUILD_NUMBER: ${env.BUILD_NUMBER ?: 'null'}"
                    echo "FIRST_RUN: ${env.FIRST_RUN ?: 'null'}"
                    echo "BRANCH_NAME: ${env.BRANCH_NAME ?: 'null'}"
                    echo "GIT BRANCH_NAME: ${env.GIT_BRANCH ?: 'null'}"
                    echo "CHANGE_BRANCH: ${env.CHANGE_BRANCH ?: 'null'}"
                }
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
                    not { branch 'main' }
                    expression { env.CHANGE_ID != null } // Only during pull requests
                    expression { env.BUILD_NUMBER == '1' || env.FIRST_RUN == 'true' } // Only on first run
                }
            }
            steps {
              sh '''
              sed -i "s/^const cacheVersion = '.*';/const cacheVersion = '$(date +%s)';/" sw.js
              if [ -n "$(git diff sw.js)" ]; then
                git add sw.js
                git commit -m "chore: update cacheVersion in sw.js [ci skip]"
                git push origin "${CHANGE_BRANCH}"
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
