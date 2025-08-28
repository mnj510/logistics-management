-- 재고 테이블에 그로스 포장 수량 컬럼 추가
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS gross_qty INTEGER DEFAULT 0;

-- 기존 데이터에 기본값 설정
UPDATE inventory SET gross_qty = 0 WHERE gross_qty IS NULL;
