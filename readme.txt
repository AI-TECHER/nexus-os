Complete Commands to Push Everything to GitHub
powershell
# 1. Check current status
git status

# 2. Add all files (including new, modified, and deleted)
git add .

# 3. Or add everything with force (including untracked files)
git add -A

# 4. Commit with a message
git commit -m "Update all files and folders"

# 5. Push to GitHub
git push origin master

# If you're on a different branch, use:
git push origin main
If You Get Errors:
Error: "src refspec master does not match any"
powershell
# Check which branch you're on
git branch

# If on master:
git push origin master

# If on main:
git push origin main
Error: "failed to push some refs"
powershell
# Pull latest changes first
git pull origin master

# Then push
git push origin master
Error: "Updates were rejected"
powershell
# Force push (use with caution)
git push origin master --force

# Or for main branch
git push origin main --force
Complete Workflow - Step by Step:
powershell
# Step 1: See what changed
git status

# Step 2: Add all changes
git add .

# Step 3: Commit with description
git commit -m "Updated all files and folders"

# Step 4: Pull latest from GitHub (to avoid conflicts)
git pull origin master

# Step 5: Push to GitHub
git push origin master
Push to a Specific Branch:
powershell
# Push to master branch
git push origin master

# Push to main branch
git push origin main

# Push to gh-pages branch (for deployment)
git push origin gh-pages

# Push and set upstream (first time only)
git push -u origin master
If You Want to Force Push Everything:
powershell
# WARNING: This overwrites remote with local changes
git push origin master --force
To Also Update Submodules:
powershell
# Add and commit submodules
git add .
git commit -m "Update all files including submodules"
git push origin master
Quick One-Liner to Push Everything:
powershell
git add . && git commit -m "Update all files" && git push origin master
Check What Will Be Pushed:
powershell
# See what files will be pushed
git status

# See the diff
git diff --staged
Summary Table:
Command	What it does
git add .	Stage all changes in current directory
git add -A	Stage ALL changes (including deleted files)
git commit -m "message"	Commit staged changes
git push origin master	Push to master branch
git push origin main	Push to main branch
git push origin gh-pages	Push to gh-pages branch
git push --force	Force push (overwrites remote)
git status	Check what's changed
Note: Replace master with main if your default branch is main.