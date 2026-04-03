terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.104.0"
    }
  }
  backend "azurerm" {
    resource_group_name  = "rg-musubi"
    storage_account_name = "stmusubi"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}

# 1. Resource Group
resource "azurerm_resource_group" "rg" {
  name     = "rg-musubi"
  location = "francecentral"
}

# 2. Storage Account
resource "azurerm_storage_account" "st" {
  name                     = "stmusubi" 
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# 3. Storage Container
resource "azurerm_storage_container" "container" {
  name                  = "saves"
  storage_account_id    = azurerm_storage_account.st.id
  container_access_type = "private"
}

# 4. Application Insights
resource "azurerm_application_insights" "appi" {
  name                = "appi-musubi"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  application_type    = "web"
}

# 5. Service Plan
resource "azurerm_service_plan" "plan" {
  name                = "asp-musubi"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "FC1"
}

# 6. Flex Consumption Function App
resource "azurerm_function_app_flex_consumption" "func" {
  name                = "musubi"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.plan.id

  # Deployment configuration
  storage_container_type      = "blobContainer"
  storage_container_endpoint  = "${azurerm_storage_account.st.primary_blob_endpoint}${azurerm_storage_container.container.name}"
  storage_authentication_type = "StorageAccountConnectionString"
  storage_access_key          = azurerm_storage_account.st.primary_access_key

  # Runtime configuration
  runtime_name                = "node"
  runtime_version             = "22"
  
  # Scaling & Resource limits (Safety first!)
  maximum_instance_count      = 1 
  instance_memory_in_mb       = 2048 # Options are 2048 or 4096

  site_config {
    application_insights_key               = azurerm_application_insights.appi.instrumentation_key
    application_insights_connection_string = azurerm_application_insights.appi.connection_string
  }

  identity {
    type = "SystemAssigned"
  }
}

# 7. Role Assignment
resource "azurerm_role_assignment" "st_role" {
  scope                = azurerm_storage_account.st.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_function_app_flex_consumption.func.identity[0].principal_id
}