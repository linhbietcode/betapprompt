param(
    [string]$RepoPath = (Join-Path $env:USERPROFILE 'Downloads\betapprompt-update-536a768d')
)
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function RepoGit {
    & git @args
    if ($LASTEXITCODE -ne 0) { throw 'Git failed. Read the message above.' }
}
function Vercel {
    & npx.cmd --yes vercel@latest @args
    if ($LASTEXITCODE -ne 0) { throw 'Vercel failed. Read the message above, then run this script again.' }
}
function EnvValue([string]$name) {
    $pattern = '^\s*' + [regex]::Escape($name) + '\s*='
    $line = Get-Content -LiteralPath (Join-Path $RepoPath 'gemini.env') |
        Where-Object { $_ -match $pattern } | Select-Object -First 1
    if (!$line) { return '' }
    return ($line -replace '^[^=]*=', '').Trim().Trim('"').Trim("'")
}

try {
    foreach ($command in @('git','node','npx.cmd')) {
        if (!(Get-Command $command -ErrorAction SilentlyContinue)) { throw ('Missing command: ' + $command) }
    }
    foreach ($path in @('.git','public\app.mjs','server\gemini.mjs','gemini.env')) {
        if (!(Test-Path -LiteralPath (Join-Path $RepoPath $path))) { throw ('Missing project file: ' + $path) }
    }
    $apiKey = EnvValue 'GEMINI_API_KEY'
    if (!$apiKey -or $apiKey -eq 'DAN_KHOA_GEMINI_CUA_BAN_VAO_DAY') {
        throw 'Fill in GEMINI_API_KEY in the existing gemini.env first.'
    }
    $model = EnvValue 'GEMINI_MODEL'

    Set-Location -LiteralPath $RepoPath
    [Environment]::CurrentDirectory = $RepoPath
    $remote = & git remote get-url origin
    if ($LASTEXITCODE -ne 0 -or $remote -ne 'https://github.com/linhbietcode/betapprompt.git') {
        throw 'This folder does not point to the expected betapprompt repository.'
    }
    $branch = & git branch --show-current
    if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw 'Switch this repository to main before deploying.' }
    $tracked = & git ls-files
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect tracked files.' }
    $private = @($tracked | Where-Object {
        $leaf = ($_ -split '/')[-1]
        $leaf -eq 'gemini.env' -or ($leaf -like '.env*' -and $leaf -notin @('.env.example','.env.sample','.env.template'))
    })
    if ($private.Count -gt 0) { throw 'A private environment file is tracked in Git. Stopped before pushing or uploading.' }

    Write-Host 'Preparing the Vercel API and deployment settings...' -ForegroundColor Cyan
    $payload = @'
{"api/recommend.mjs":"aW1wb3J0IHtoYW5kbGVSZWNvbW1lbmR9IGZyb20gJy4uL3NlcnZlci9nZW1pbmkubWpzJzsKCmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVWZXJjZWxIYW5kbGVyKGVudmlyb25tZW50ID0gcHJvY2Vzcy5lbnYsIGZldGNoZXIgPSBmZXRjaCkgewogIHJldHVybiBhc3luYyByZXF1ZXN0ID0+IHsKICAgIGNvbnN0IGtleSA9IFN0cmluZyhlbnZpcm9ubWVudC5HRU1JTklfQVBJX0tFWSA/PyAnJykudHJpbSgpOwogICAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKHJlcXVlc3QuaGVhZGVycyk7CiAgICBoZWFkZXJzLmRlbGV0ZSgnb2FpLWF1dGhlbnRpY2F0ZWQtdXNlci1pZCcpOwogICAgaGVhZGVycy5kZWxldGUoJ2NmLWNvbm5lY3RpbmctaXAnKTsKICAgIC8vIFZlcmNlbCBzdXBwbGllcyB0aGlzIGhlYWRlcjsgZG8gbm90IHRydXN0IGNsaWVudC1zdXBwbGllZCBpZGVudGl0eSBoZWFkZXJzLgogICAgY29uc3QgYWRkcmVzcyA9IGhlYWRlcnMuZ2V0KCd4LXZlcmNlbC1mb3J3YXJkZWQtZm9yJyk/LnNwbGl0KCcsJylbMF0udHJpbSgpOwogICAgaGVhZGVycy5zZXQoJ2NmLWNvbm5lY3RpbmctaXAnLCAndmVyY2VsOicgKyAoYWRkcmVzcyB8fCAndW5rbm93bicpKTsKICAgIHJldHVybiBoYW5kbGVSZWNvbW1lbmQobmV3IFJlcXVlc3QocmVxdWVzdCwge2hlYWRlcnN9KSwgewogICAgICBHRU1JTklfQVBJX0tFWToga2V5ICYmIGtleSAhPT0gJ0RBTl9LSE9BX0dFTUlOSV9DVUFfQkFOX1ZBT19EQVknID8ga2V5IDogdW5kZWZpbmVkLAogICAgICBHRU1JTklfTU9ERUw6IGVudmlyb25tZW50LkdFTUlOSV9NT0RFTCwKICAgIH0sIGZldGNoZXIpOwogIH07Cn0KCmV4cG9ydCBkZWZhdWx0IHtmZXRjaDogY3JlYXRlVmVyY2VsSGFuZGxlcigpfTsK","vercel.json":"ewogICIkc2NoZW1hIjogImh0dHBzOi8vb3BlbmFwaS52ZXJjZWwuc2gvdmVyY2VsLmpzb24iLAogICJmcmFtZXdvcmsiOiBudWxsLAogICJidWlsZENvbW1hbmQiOiAiIiwKICAiaW5zdGFsbENvbW1hbmQiOiAiIiwKICAib3V0cHV0RGlyZWN0b3J5IjogInB1YmxpYyIsCiAgImZ1bmN0aW9ucyI6IHsKICAgICJhcGkvcmVjb21tZW5kLm1qcyI6IHsibWF4RHVyYXRpb24iOiAzMH0KICB9LAogICJyZXdyaXRlcyI6IFsKICAgIHsic291cmNlIjogIi8iLCAiZGVzdGluYXRpb24iOiAiL2RlbW8uaHRtbCJ9CiAgXSwKICAiaGVhZGVycyI6IFsKICAgIHsKICAgICAgInNvdXJjZSI6ICIvKC4qKSIsCiAgICAgICJoZWFkZXJzIjogWwogICAgICAgIHsia2V5IjogIlgtQ29udGVudC1UeXBlLU9wdGlvbnMiLCAidmFsdWUiOiAibm9zbmlmZiJ9LAogICAgICAgIHsia2V5IjogIlJlZmVycmVyLVBvbGljeSIsICJ2YWx1ZSI6ICJzdHJpY3Qtb3JpZ2luLXdoZW4tY3Jvc3Mtb3JpZ2luIn0KICAgICAgXQogICAgfQogIF0KfQo=",".vercelignore":"Z2VtaW5pLmVudgouZW52KgouZ2l0LwoudmVyY2VsLwpub2RlX21vZHVsZXMvCnRlc3RzLwoqLmxvZwoqLmJhdAoqLnBzMQpSRUFETUUubWQK","tests/vercel.test.mjs":"aW1wb3J0IHRlc3QgZnJvbSAnbm9kZTp0ZXN0JzsKaW1wb3J0IGFzc2VydCBmcm9tICdub2RlOmFzc2VydC9zdHJpY3QnOwppbXBvcnQge3JlYWRGaWxlfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJzsKaW1wb3J0IHtjcmVhdGVWZXJjZWxIYW5kbGVyfSBmcm9tICcuLi9hcGkvcmVjb21tZW5kLm1qcyc7CmltcG9ydCB7bWFrZVNldH0gZnJvbSAnLi4vcHVibGljL2NhdGFsb2cubWpzJzsKaW1wb3J0IHtzdHVkaW9DYW5kaWRhdGVzfSBmcm9tICcuLi9wdWJsaWMvcmVjb21tZW5kYXRpb24ubWpzJzsKCmNvbnN0IGVuZHBvaW50PSdodHRwczovL3ZpZXRwaHVjLWV4YW1wbGUudmVyY2VsLmFwcC9hcGkvcmVjb21tZW5kJzsKdGVzdCgnVmVyY2VsIGFkYXB0ZXIgcmVhZHMgb25seSBob3N0aW5nIHNlY3JldHMsIHJldGFpbnMgc2FtZS1vcmlnaW4gdmFsaWRhdGlvbiBhbmQgZm9yd2FyZHMgdmFsaWQgcmVzdWx0cycsYXN5bmMoKT0+ewogIGNvbnN0IGNvbnRleHQ9bWFrZVNldCgnYW9kYWknLCdzY2hvb2wnLCdlbGVnYW50Jyk7CiAgbGV0IGNhbGxzPTA7CiAgY29uc3QgaGFuZGxlcj1jcmVhdGVWZXJjZWxIYW5kbGVyKHtHRU1JTklfQVBJX0tFWTonaG9zdGluZy10ZXN0LXNlY3JldCd9LGFzeW5jKHVybCxpbml0KT0+ewogICAgY2FsbHMrKzthc3NlcnQuZXF1YWwoaW5pdC5oZWFkZXJzWyd4LWdvb2ctYXBpLWtleSddLCdob3N0aW5nLXRlc3Qtc2VjcmV0Jyk7CiAgICByZXR1cm4gUmVzcG9uc2UuanNvbih7Y2FuZGlkYXRlczpbe2NvbnRlbnQ6e3BhcnRzOlt7dGV4dDpKU09OLnN0cmluZ2lmeSh7Y2FuZGlkYXRlSWQ6c3R1ZGlvQ2FuZGlkYXRlcyhjb250ZXh0LCd0w61tIGtow7NpJykuZmluZCh4PT54LnNldC5jb2xvcj09PSdsaWxhYycpLmlkLGV4cGxhbmF0aW9uOidDaOG7jW4gdMOtbSBraMOzaSB0aGVvIG3DtCB04bqjLid9KX1dfX1dfSk7CiAgfSk7CiAgY29uc3Qgc3RhdHVzPWF3YWl0IGhhbmRsZXIobmV3IFJlcXVlc3QoZW5kcG9pbnQpKTsKICBhc3NlcnQuZGVlcEVxdWFsKGF3YWl0IHN0YXR1cy5qc29uKCkse2NvbmZpZ3VyZWQ6dHJ1ZX0pOwogIGNvbnN0IHJlcXVlc3Q9KCk9Pm5ldyBSZXF1ZXN0KGVuZHBvaW50LHttZXRob2Q6J1BPU1QnLGhlYWRlcnM6e29yaWdpbjpuZXcgVVJMKGVuZHBvaW50KS5vcmlnaW4sJ2NvbnRlbnQtdHlwZSc6J2FwcGxpY2F0aW9uL2pzb24nLCd4LXZlcmNlbC1mb3J3YXJkZWQtZm9yJzonMTkyLjAuMi4xMjMnfSxib2R5OkpTT04uc3RyaW5naWZ5KHttb2RlOidzdHVkaW8nLGNvbnRleHQsdGV4dDondMOtbSBraMOzaScsYXBpS2V5Oidicm93c2VyLW92ZXJyaWRlJ30pfSk7CiAgY29uc3QgcmVzcG9uc2U9YXdhaXQgaGFuZGxlcihyZXF1ZXN0KCkpOwogIGFzc2VydC5lcXVhbChyZXNwb25zZS5zdGF0dXMsMjAwKTsKICBjb25zdCB0ZXh0PWF3YWl0IHJlc3BvbnNlLnRleHQoKTthc3NlcnQoIXRleHQuaW5jbHVkZXMoJ2hvc3RpbmctdGVzdC1zZWNyZXQnKSk7CiAgYXNzZXJ0LmVxdWFsKEpTT04ucGFyc2UodGV4dCkuc2V0LmNvbG9yLCdsaWxhYycpO2Fzc2VydC5lcXVhbChjYWxscywxKTsKICBjb25zdCB3cm9uZ09yaWdpbj1uZXcgUmVxdWVzdChlbmRwb2ludCx7bWV0aG9kOidQT1NUJyxoZWFkZXJzOntvcmlnaW46J2h0dHBzOi8vb3RoZXIuZXhhbXBsZSd9LGJvZHk6J3t9J30pOwogIGFzc2VydC5lcXVhbCgoYXdhaXQgaGFuZGxlcih3cm9uZ09yaWdpbikpLnN0YXR1cyw0MDMpO2Fzc2VydC5lcXVhbChjYWxscywxKTsKICBjb25zdCBtaXNzaW5nPWNyZWF0ZVZlcmNlbEhhbmRsZXIoe30pOwogIGFzc2VydC5kZWVwRXF1YWwoYXdhaXQgKGF3YWl0IG1pc3NpbmcobmV3IFJlcXVlc3QoZW5kcG9pbnQpKSkuanNvbigpLHtjb25maWd1cmVkOmZhbHNlfSk7CiAgY29uc3Qgbm9LZXk9YXdhaXQgbWlzc2luZyhyZXF1ZXN0KCkpO2Fzc2VydC5lcXVhbChub0tleS5zdGF0dXMsNTAzKTsKICBhc3NlcnQuZXF1YWwoKGF3YWl0IG5vS2V5Lmpzb24oKSkuZXJyb3IsJ2dlbWluaV9ub3RfY29uZmlndXJlZCcpOwp9KTsKCnRlc3QoJ3B1YmxpYyBhZGFwdGVyIGlnbm9yZXMgZm9yZ2VkIGlkZW50aXR5IGhlYWRlcnMgZm9yIGl0cyBiZXN0LWVmZm9ydCByYXRlIGxpbWl0Jyxhc3luYygpPT57CiAgY29uc3QgaGFuZGxlcj1jcmVhdGVWZXJjZWxIYW5kbGVyKHt9KTsKICBjb25zdCBjb250ZXh0PW1ha2VTZXQoJ2FvZGFpJywnc2Nob29sJywnZWxlZ2FudCcpOwogIGZvcihsZXQgaT0wO2k8MTY7aSsrKSB7CiAgICBjb25zdCByZXE9bmV3IFJlcXVlc3QoZW5kcG9pbnQse21ldGhvZDonUE9TVCcsaGVhZGVyczp7J3gtdmVyY2VsLWZvcndhcmRlZC1mb3InOicxOTIuMC4yLjIyMicsJ29haS1hdXRoZW50aWNhdGVkLXVzZXItaWQnOidmb3JnZWQtJytpLCdjZi1jb25uZWN0aW5nLWlwJzonZmFrZS0nK2l9LGJvZHk6SlNPTi5zdHJpbmdpZnkoe21vZGU6J3N0dWRpbycsY29udGV4dCx0ZXh0Oid0xrDGoWkgdOG6r24nfSl9KTsKICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgaGFuZGxlcihyZXEpKS5zdGF0dXMsaTwxNT81MDM6NDI5KTsKICB9Cn0pOwoKdGVzdCgnZGVwbG95bWVudCBzZXJ2ZXMgb25seSBwdWJsaWMgYXNzZXRzIGFuZCBleGNsdWRlcyBwcml2YXRlIGxvY2FsIGNvbmZpZ3VyYXRpb24nLGFzeW5jKCk9PnsKICBjb25zdCBjb25maWc9SlNPTi5wYXJzZShhd2FpdCByZWFkRmlsZShuZXcgVVJMKCcuLi92ZXJjZWwuanNvbicsaW1wb3J0Lm1ldGEudXJsKSwndXRmOCcpKTsKICBhc3NlcnQuZXF1YWwoY29uZmlnLm91dHB1dERpcmVjdG9yeSwncHVibGljJyk7CiAgYXNzZXJ0LmRlZXBFcXVhbChjb25maWcucmV3cml0ZXMsW3tzb3VyY2U6Jy8nLGRlc3RpbmF0aW9uOicvZGVtby5odG1sJ31dKTsKICBhc3NlcnQuZXF1YWwoY29uZmlnLmZ1bmN0aW9uc1snYXBpL3JlY29tbWVuZC5tanMnXS5tYXhEdXJhdGlvbiwzMCk7CiAgY29uc3QgaWdub3Jlcz1hd2FpdCByZWFkRmlsZShuZXcgVVJMKCcuLi8udmVyY2VsaWdub3JlJyxpbXBvcnQubWV0YS51cmwpLCd1dGY4Jyk7CiAgYXNzZXJ0KGlnbm9yZXMuc3BsaXQoJ1xuJykuaW5jbHVkZXMoJ2dlbWluaS5lbnYnKSk7CiAgYXNzZXJ0KGlnbm9yZXMuc3BsaXQoJ1xuJykuaW5jbHVkZXMoJy5lbnYqJykpOwp9KTsK"}
'@ | ConvertFrom-Json
    foreach ($file in $payload.PSObject.Properties) {
        $destination = Join-Path $RepoPath $file.Name
        $null = New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force
        [IO.File]::WriteAllBytes($destination, [Convert]::FromBase64String($file.Value))
    }
    $ignorePath = Join-Path $RepoPath '.gitignore'
    $ignore = if (Test-Path -LiteralPath $ignorePath) { [IO.File]::ReadAllText($ignorePath) } else { '' }
    foreach ($pattern in @('gemini.env','.env*','.vercel/')) {
        if (($ignore -split '\r?\n') -notcontains $pattern) { $ignore = $ignore.TrimEnd() + "`n" + $pattern + "`n" }
    }
    [IO.File]::WriteAllText($ignorePath, $ignore, $utf8)
    $savedScript = Join-Path $RepoPath 'DEPLOY-VERCEL.ps1'
    if ([IO.Path]::GetFullPath($PSCommandPath) -ne [IO.Path]::GetFullPath($savedScript)) {
        Copy-Item -LiteralPath $PSCommandPath -Destination $savedScript -Force
    }

    & node --test tests/vercel.test.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Deployment tests failed. Stopped before pushing or deploying.' }
    $changedFiles = @('api/recommend.mjs','vercel.json','.vercelignore','.gitignore','tests/vercel.test.mjs','DEPLOY-VERCEL.ps1')
    RepoGit add -- @changedFiles
    & git diff --cached --quiet -- @changedFiles
    $diffStatus = $LASTEXITCODE
    if ($diffStatus -gt 1) { throw 'Could not inspect staged changes.' }
    if ($diffStatus -eq 1) {
        RepoGit --no-pager diff --cached --stat -- @changedFiles
        RepoGit commit --only -m 'Add Vercel deployment with server-side Gemini secrets' -- @changedFiles
    }
    RepoGit push origin main

    Write-Host 'Checking Vercel login. The first run downloads the CLI.' -ForegroundColor Cyan
    & npx.cmd --yes vercel@latest whoami
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Sign in or create a Vercel account in the browser, then return here.' -ForegroundColor Yellow
        Vercel login
    }

    $projectFile = Join-Path $RepoPath '.vercel\project.json'
    $nameFile = Join-Path $RepoPath '.vercel\vietphuc-deploy-name.txt'
    if (!(Test-Path -LiteralPath $projectFile)) {
        if (Test-Path -LiteralPath $nameFile) {
            $projectName = ([IO.File]::ReadAllText($nameFile)).Trim()
            & npx.cmd --yes vercel@latest project inspect $projectName
            if ($LASTEXITCODE -ne 0) { Vercel project add $projectName }
        } else {
            $projectName = 'vietphuc-remix-' + [guid]::NewGuid().ToString('N').Substring(0,6)
            $null = New-Item -ItemType Directory -Path (Split-Path -Parent $nameFile) -Force
            [IO.File]::WriteAllText($nameFile, $projectName, $utf8)
            Vercel project add $projectName
        }
        Vercel link --yes --project $projectName
    } else {
        $projectName = if (Test-Path -LiteralPath $nameFile) { ([IO.File]::ReadAllText($nameFile)).Trim() } else { '' }
    }

    Write-Host 'Saving the Gemini key as a production Secret (the value is not printed).' -ForegroundColor Cyan
    $apiKey | & npx.cmd --yes vercel@latest env add GEMINI_API_KEY production --sensitive --force --yes
    if ($LASTEXITCODE -ne 0) { throw 'Could not save GEMINI_API_KEY on Vercel.' }
    $apiKey = $null
    if ($model) {
        $model | & npx.cmd --yes vercel@latest env add GEMINI_MODEL production --no-sensitive --force --yes
        if ($LASTEXITCODE -ne 0) { throw 'Could not save GEMINI_MODEL on Vercel.' }
    }

    Write-Host 'Deploying production. Wait for the build to finish...' -ForegroundColor Cyan
    $output = & npx.cmd --yes vercel@latest deploy --prod --yes
    if ($LASTEXITCODE -ne 0) { throw 'The deployment did not complete. Read the Vercel error above.' }
    $deploymentUrl = (@($output) -join "`n").Trim()
    if ($deploymentUrl -notmatch '^https://[a-zA-Z0-9.-]+\.vercel\.app/?$') { throw 'Deployment finished but the URL could not be read. Check the Vercel dashboard.' }

    $urls = @()
    if ($projectName) { $urls += 'https://' + $projectName + '.vercel.app' }
    $urls += $deploymentUrl
    $publicUrl = $null
    foreach ($url in ($urls | Select-Object -Unique)) {
        try {
            $home = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 25
            $status = Invoke-RestMethod -Uri ($url.TrimEnd('/') + '/api/recommend') -TimeoutSec 25
            if ($home.StatusCode -eq 200 -and $home.Content -match 'app\.mjs' -and $status.configured -eq $true) {
                $publicUrl = $url
                break
            }
        } catch { }
    }
    if ($publicUrl) {
        Write-Host ('PUBLIC DEMO: ' + $publicUrl) -ForegroundColor Green
        Write-Host 'Homepage and API configuration passed an anonymous check. Send a description on the site to test the live Gemini response.'
        Start-Process $publicUrl
    } else {
        Write-Host ('Deployment created: ' + $deploymentUrl) -ForegroundColor Yellow
        Write-Host 'Public access or API configuration was not verified. Check the production domain and Settings > Deployment Protection in Vercel before submitting.'
    }
    Write-Host 'Future deploys: run DEPLOY-VERCEL.ps1 from the same repository folder.'
} catch {
    Write-Host ('DEPLOY STOPPED: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
