variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name used for resource naming"
  type        = string
  default     = "complif"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "complif"
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret for the backend"
  type        = string
  sensitive   = true
}

variable "backend_image" {
  description = "Docker image URI for the backend (ECR)"
  type        = string
}

variable "microservice_image" {
  description = "Docker image URI for the format-validation microservice (ECR)"
  type        = string
}

variable "vercel_project_name" {
  description = "Vercel project name for the frontend"
  type        = string
  default     = "complif-frontend"
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS on the ALB"
  type        = string
}
