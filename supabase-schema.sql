-- 물류 관리 시스템 Supabase 데이터베이스 스키마
-- 이 SQL을 Supabase SQL Editor에서 실행해주세요

-- 출퇴근 기록 테이블
CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGINT PRIMARY KEY,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    work_hours INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 재고 테이블
CREATE TABLE IF NOT EXISTS inventory (
    id BIGINT PRIMARY KEY,
    barcode VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 0,
    unit VARCHAR(50) DEFAULT '개',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 거래 내역 테이블 (입출고)
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT PRIMARY KEY,
    product_id BIGINT REFERENCES inventory(id),
    product_name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('입고', '출고')),
    quantity INTEGER NOT NULL,
    timestamp VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 포장 기록 테이블
CREATE TABLE IF NOT EXISTS packing_records (
    id BIGINT PRIMARY KEY,
    product_id BIGINT REFERENCES inventory(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT '포장완료' CHECK (status IN ('포장완료', '출고완료')),
    timestamp VARCHAR(255) NOT NULL,
    shipped_at VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 업무 루틴 테이블
CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS (Row Level Security) 정책 설정
-- 모든 사용자가 모든 데이터에 접근할 수 있도록 설정 (물류 시스템 특성상)

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 모든 작업 허용 정책
CREATE POLICY "모든 사용자 접근 허용" ON attendance_records FOR ALL USING (true);
CREATE POLICY "모든 사용자 접근 허용" ON inventory FOR ALL USING (true);
CREATE POLICY "모든 사용자 접근 허용" ON transactions FOR ALL USING (true);
CREATE POLICY "모든 사용자 접근 허용" ON packing_records FOR ALL USING (true);
CREATE POLICY "모든 사용자 접근 허용" ON tasks FOR ALL USING (true);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_packing_product_id ON packing_records(product_id);
CREATE INDEX IF NOT EXISTS idx_packing_status ON packing_records(status);

-- 기본 업무 데이터 삽입
INSERT INTO tasks (id, name, description, completed) VALUES
(1, '작업장 청소', '작업장 전체 청소 및 정리', false),
(2, '재고 점검', '일일 재고 수량 확인', false),
(3, '안전점검', '작업장 안전시설 점검', false)
ON CONFLICT (id) DO NOTHING;
