import os
from typing import Dict, Any

class DifyConfig:
    """Configuration for Dify API integration"""
    
    DIFY_API_BASE_URL = "https://api.dify.ai"
    
    # 「YES部品納品書(PNG)_複数」アプリ
    DIFY_API_KEY = "app-rn8gqMRYlEYkDH0rAntmbDJV"
    DIFY_WORKFLOW_ID = "ed1cebe9-c907-4769-b1ac-e0e23aa6cff7"

    WORKFLOW_RUN_ENDPOINT = "/v1/workflows/run"
    WORKFLOW_DETAIL_ENDPOINT = "/v1/workflows/run/{workflow_run_id}"
    
    @classmethod
    def get_headers(cls) -> Dict[str, str]:
        """Get headers for Dify API requests"""
        return {
            "Authorization": f"Bearer {cls.DIFY_API_KEY}",
            "Content-Type": "application/json"
        }
    
    @classmethod
    def get_workflow_run_url(cls) -> str:
        """Get URL for workflow execution"""
        return f"{cls.DIFY_API_BASE_URL}{cls.WORKFLOW_RUN_ENDPOINT}"
    
    @classmethod
    def get_workflow_detail_url(cls, workflow_run_id: str) -> str:
        """Get URL for workflow run detail"""
        return f"{cls.DIFY_API_BASE_URL}{cls.WORKFLOW_DETAIL_ENDPOINT.format(workflow_run_id=workflow_run_id)}"
