import json

sample_data = [
    {
        "出荷日": "25/08/01",
        "受注番号": "1234567",
        "納入先番号": "00000000",
        "担当者": "田中",
        "部品番号": ["123456-7890"],
        "部品名": ["パッキン"],
        "運賃": "0",
        "数量": ["1"],
        "売上単価": ["100"],
        "売上金額": ["100"],
        "税抜合計": "100"
    },
    {
        "出荷日": "25/08/08",
        "受注番号": "9876547",
        "納入先番号": "00000001",
        "担当者": "山本",
        "部品番号": ["12345-67890"],
        "部品名": ["ホース"],
        "運賃": "500",
        "数量": ["10"],
        "売上単価": ["500"],
        "売上金額": ["5000"],
        "税抜合計": "5500"
    },
    {
        "出荷日": "25/01/01",
        "受注番号": "1212123",
        "納入先番号": "00000002",
        "担当者": "山田",
        "部品番号": ["12345-67890", "98760-54321", "111111-22222"],
        "部品名": ["パッキン", "エレメントK", "フィルタ"],
        "運賃": "0",
        "数量": ["1", "1", "8"],
        "売上単価": ["500", "10", "20"],
        "売上金額": ["500", "10", "160"],
        "税抜合計": "670"
    }
]

print("JSON Structure Analysis:")
print("=" * 50)

for i, record in enumerate(sample_data):
    print(f"\nRecord {i+1}:")
    print("-" * 20)
    
    basic_fields = []
    array_fields = []
    
    for key, value in record.items():
        if isinstance(value, list):
            array_fields.append((key, value))
            print(f"  {key}: {type(value).__name__} with {len(value)} items = {value}")
        else:
            basic_fields.append((key, value))
            print(f"  {key}: {type(value).__name__} = {value}")
    
    print(f"\n  Basic fields: {len(basic_fields)}")
    print(f"  Array fields: {len(array_fields)}")
    
    if array_fields:
        array_lengths = [len(arr[1]) for arr in array_fields]
        print(f"  Array lengths: {array_lengths}")
        if len(set(array_lengths)) == 1:
            print(f"  ✓ All arrays have same length: {array_lengths[0]}")
        else:
            print(f"  ⚠ Arrays have different lengths!")

print("\n" + "=" * 50)
print("Database Schema Planning:")
print("=" * 50)

print("\nBasic Info Table (基本情報):")
print("- id (PRIMARY KEY)")
print("- 出荷日 (DATE)")
print("- 受注番号 (TEXT)")
print("- 納入先番号 (TEXT)")
print("- 担当者 (TEXT)")
print("- 運賃 (INTEGER)")
print("- 税抜合計 (INTEGER)")
print("- created_at (TIMESTAMP)")

print("\nParts Info Table (部品情報):")
print("- id (PRIMARY KEY)")
print("- basic_info_id (FOREIGN KEY)")
print("- 部品番号 (TEXT)")
print("- 部品名 (TEXT)")
print("- 数量 (INTEGER)")
print("- 売上単価 (INTEGER)")
print("- 売上金額 (INTEGER)")
