# ──────────────────────────────────────────────
# Vercel — frontend hosting
# ──────────────────────────────────────────────

resource "vercel_project" "frontend" {
  name      = var.vercel_project_name
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = "cijjas/compliance"
  }

  root_directory = "frontend"

  environment = [
    {
      key    = "NEXT_PUBLIC_API_URL"
      value  = "https://${aws_lb.main.dns_name}/api"
      target = ["production"]
    },
  ]
}
