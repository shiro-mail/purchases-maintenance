# Changelog

## [Latest] - 2025-08-10

### Added
- Multiple PNG file selection for Dify uploads
- JSON upload support for Dify-style format with markdown-formatted JSON blocks
- Backward compatibility for direct JSON array uploads

### Fixed
- "ファイルの読み込み中にエラーです。" error when uploading JSON files via "ファイルから取得" option
- Dify file type detection error for PNG uploads
- Button color styling (edit buttons yellow, delete buttons red)

### Technical Details
- Added `/api/dify/fetch-data-multiple` endpoint for processing multiple files
- Enhanced `/upload` endpoint with regex parsing for markdown JSON extraction
- Dynamic file type detection for Dify API integration
