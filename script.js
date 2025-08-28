// 물류 관리 시스템 JavaScript

class LogisticsManager {
    constructor() {
        this.isAdminMode = false;
        this.currentEditingProduct = null;
        this.currentEditingTask = null;
        this.supabase = null;
        
        // 데이터 초기화
        this.attendanceRecords = [];
        this.inventory = [];
        this.transactions = [];
        this.packingRecords = [];
        this.tasks = [];
        this.scannedProducts = []; // 스캔된 상품 목록
        this.currentTransactionType = 'in'; // 현재 거래 유형
        this.completionAlertShown = false; // 완료 알림 표시 여부
        
        this.initSupabase();
        this.init();
        this.setupEventListeners();
        this.initializeTimeSelector();
        this.initializeDateFilters();
        this.initializeHistoryFilters();
        
        // 비동기 데이터 로딩 및 UI 업데이트
        this.initializeApp();
    }

    async initializeApp() {
        try {
            await this.loadData();
            this.updateAttendanceDisplay();
            this.updateInventoryDisplay();
            this.updateTransactionHistory();
            this.updatePackingHistory();
            this.updateTaskDisplay();
            this.updateProductSelectors();
        } catch (error) {
            console.error('앱 초기화 오류:', error);
            // 오류 발생 시 로컬 스토리지에서 로드
            this.loadFromLocalStorage();
            this.updateAttendanceDisplay();
            this.updateInventoryDisplay();
            this.updateTransactionHistory();
            this.updatePackingHistory();
            this.updateTaskDisplay();
            this.updateProductSelectors();
        }
    }

    // Supabase 초기화
    initSupabase() {
        // Supabase 설정 - 환경변수 또는 설정 파일에서 가져오기
        const supabaseUrl = window.SUPABASE_URL || 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
        
        if (supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY') {
            this.supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
            console.log('Supabase 연결됨');
        } else {
            console.log('로컬 스토리지 모드로 실행 중');
        }
    }

    init() {
        // 기본 데이터 구조 초기화
        if (!localStorage.getItem('attendanceRecords')) {
            localStorage.setItem('attendanceRecords', JSON.stringify([]));
        }
        if (!localStorage.getItem('inventory')) {
            localStorage.setItem('inventory', JSON.stringify([]));
        }
        if (!localStorage.getItem('transactions')) {
            localStorage.setItem('transactions', JSON.stringify([]));
        }
        if (!localStorage.getItem('packingRecords')) {
            localStorage.setItem('packingRecords', JSON.stringify([]));
        }
        if (!localStorage.getItem('tasks')) {
            localStorage.setItem('tasks', JSON.stringify([
                {
                    id: 1,
                    name: '작업장 청소',
                    description: '작업장 전체 청소 및 정리',
                    completed: false
                },
                {
                    id: 2,
                    name: '재고 점검',
                    description: '일일 재고 수량 확인',
                    completed: false
                },
                {
                    id: 3,
                    name: '안전점검',
                    description: '작업장 안전시설 점검',
                    completed: false
                }
            ]));
        }
    }

    async loadData() {
        if (this.supabase) {
            await this.loadFromSupabase();
        } else {
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        this.attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
        this.inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
        this.transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        this.packingRecords = JSON.parse(localStorage.getItem('packingRecords') || '[]');
        this.tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        
        // 기존 로컬 스토리지 데이터를 Supabase 형식으로 변환
        this.convertLegacyData();
    }

    // 기존 데이터를 Supabase 형식으로 변환
    convertLegacyData() {
        this.attendanceRecords = this.attendanceRecords.map(record => ({
            ...record,
            check_in: record.check_in || record.checkIn,
            check_out: record.check_out || record.checkOut,
            work_hours: record.work_hours || record.workHours || 0
        }));
    }

    async loadFromSupabase() {
        try {
            console.log('Supabase에서 데이터 로드 시작...');
            
            const [attendance, inventory, transactions, packing, tasks] = await Promise.all([
                this.supabase.from('attendance_records').select('*').order('date', { ascending: false }),
                this.supabase.from('inventory').select('*'),
                this.supabase.from('transactions').select('*').order('created_at', { ascending: false }),
                this.supabase.from('packing_records').select('*').order('created_at', { ascending: false }),
                this.supabase.from('tasks').select('*')
            ]);

            console.log('Supabase 데이터 로드 결과:', {
                attendance: attendance.data?.length || 0,
                inventory: inventory.data?.length || 0,
                transactions: transactions.data?.length || 0,
                packing: packing.data?.length || 0,
                tasks: tasks.data?.length || 0
            });

            if (attendance.error) console.error('출퇴근 데이터 로드 오류:', attendance.error);
            if (inventory.error) console.error('재고 데이터 로드 오류:', inventory.error);
            if (transactions.error) console.error('거래 데이터 로드 오류:', transactions.error);
            if (packing.error) console.error('포장 데이터 로드 오류:', packing.error);
            if (tasks.error) console.error('업무 데이터 로드 오류:', tasks.error);

            this.attendanceRecords = attendance.data || [];
            this.inventory = inventory.data || [];
            this.transactions = transactions.data || [];
            this.packingRecords = packing.data || [];
            this.tasks = tasks.data || [];
            
            console.log('로드된 출퇴근 기록:', this.attendanceRecords);
            
            // 데이터 로드 후 즉시 UI 업데이트
            setTimeout(() => {
                console.log('UI 업데이트 시작...');
                this.updateAttendanceDisplay();
                this.updateInventoryDisplay();
                this.updateTransactionHistory();
                this.updatePackingHistory();
                this.updateTaskDisplay();
                console.log('상품 선택기 업데이트 전 재고 데이터:', this.inventory);
                this.updateProductSelectors();
                console.log('UI 업데이트 완료');
            }, 100);
            
            // 자동 업데이트 제거 - 상품 선택 사라짐 문제 방지
            // 필요시 수동으로만 "상품목록 새로고침" 버튼 사용
            
        } catch (error) {
            console.error('Supabase에서 데이터 로드 실패:', error);
            this.loadFromLocalStorage(); // fallback to localStorage
        }
    }

    async saveData() {
        if (this.supabase) {
            await this.saveToSupabase();
        } else {
            this.saveToLocalStorage();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('attendanceRecords', JSON.stringify(this.attendanceRecords));
        localStorage.setItem('inventory', JSON.stringify(this.inventory));
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
        localStorage.setItem('packingRecords', JSON.stringify(this.packingRecords));
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    async saveToSupabase() {
        try {
            // 각 테이블에 데이터 저장 (upsert 사용)
            if (this.attendanceRecords.length > 0) {
                await this.syncTableData('attendance_records', this.attendanceRecords);
            }
            if (this.inventory.length > 0) {
                await this.syncTableData('inventory', this.inventory);
            }
            if (this.transactions.length > 0) {
                await this.syncTableData('transactions', this.transactions);
            }
            if (this.packingRecords.length > 0) {
                await this.syncTableData('packing_records', this.packingRecords);
            }
            if (this.tasks.length > 0) {
                await this.syncTableData('tasks', this.tasks);
            }
            
            // 로컬 스토리지에도 백업 저장
            this.saveToLocalStorage();
            console.log('Supabase 동기화 완료');
        } catch (error) {
            console.error('Supabase에 데이터 저장 실패:', error);
            this.saveToLocalStorage(); // fallback to localStorage
        }
    }

    async syncTableData(tableName, data) {
        if (!data || data.length === 0) return;
        
        try {
            // 테이블별로 필요한 컬럼만 필터링
            let cleanedData = data;
            
            if (tableName === 'attendance_records') {
                cleanedData = data.map(record => ({
                    id: record.id,
                    date: record.date,
                    check_in: record.check_in,
                    check_out: record.check_out,
                    work_hours: record.work_hours || 0
                }));
            } else if (tableName === 'inventory') {
                cleanedData = data.map(record => ({
                    id: record.id,
                    barcode: record.barcode,
                    name: record.name,
                    quantity: record.quantity || 0,
                    gross_qty: record.gross_qty || 0,
                    unit: record.unit || '개'
                }));
            } else if (tableName === 'transactions') {
                cleanedData = data.map(record => ({
                    id: record.id,
                    product_id: record.product_id || record.productId,
                    product_name: record.product_name || record.productName,
                    type: record.type,
                    quantity: record.quantity,
                    timestamp: record.timestamp
                }));
            } else if (tableName === 'packing_records') {
                cleanedData = data.map(record => ({
                    id: record.id,
                    product_id: record.product_id || record.productId,
                    product_name: record.product_name || record.productName,
                    quantity: record.quantity,
                    status: record.status || '포장완료',
                    timestamp: record.timestamp,
                    shipped_at: record.shipped_at || record.shippedAt
                }));
            } else if (tableName === 'tasks') {
                cleanedData = data.map(record => ({
                    id: record.id,
                    name: record.name,
                    description: record.description,
                    completed: record.completed || false
                }));
            }
            
            console.log(`${tableName} 정리된 데이터:`, cleanedData);
            
            const { data: result, error } = await this.supabase
                .from(tableName)
                .upsert(cleanedData, { 
                    onConflict: 'id',
                    ignoreDuplicates: false 
                });
                
            if (error) {
                console.error(`${tableName} 동기화 실패:`, error);
                throw error;
            } else {
                console.log(`${tableName} 동기화 성공:`, result);
            }
        } catch (error) {
            console.error(`${tableName} 동기화 중 오류:`, error);
            throw error;
        }
    }

    setupEventListeners() {
        // 사이드바 토글
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });

        // 네비게이션
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('.nav-link').dataset.section;
                this.showSection(section);
                
                // 활성 링크 업데이트
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.target.closest('.nav-link').classList.add('active');
            });
        });

        // 관리자 모드
        document.getElementById('adminBtn').addEventListener('click', () => {
            if (this.isAdminMode) {
                this.toggleAdminMode(false);
            } else {
                document.getElementById('adminModal').style.display = 'block';
            }
        });

        document.getElementById('adminLoginBtn').addEventListener('click', () => {
            const password = document.getElementById('adminPassword').value;
            if (password === '0455') {
                this.toggleAdminMode(true);
                document.getElementById('adminModal').style.display = 'none';
                document.getElementById('adminPassword').value = '';
                alert('관리자 모드가 활성화되었습니다.');
            } else {
                alert('비밀번호가 올바르지 않습니다.');
            }
        });

        // 출퇴근 관리
        document.getElementById('checkInBtn').addEventListener('click', () => this.checkIn());
        document.getElementById('checkOutBtn').addEventListener('click', () => this.checkOut());
        document.getElementById('filterBtn').addEventListener('click', () => this.filterAttendance());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        
        // 내역 필터 버튼
        document.getElementById('filterTransactionBtn').addEventListener('click', () => this.filterTransactionHistory());
        document.getElementById('filterPackingBtn').addEventListener('click', () => this.filterPackingHistory());
        
        // 상품별 내역 필터 버튼
        document.getElementById('filterProductHistoryBtn').addEventListener('click', () => this.updateProductHistoryDisplay());
        document.getElementById('clearProductHistoryFilterBtn').addEventListener('click', () => {
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';
            this.updateProductHistoryDisplay();
        });
        
        // 데이터 새로고침 기능 (5초마다 자동 새로고침)
        setInterval(() => this.refreshData(), 5000);

        // 재고 관리
        document.getElementById('addProductBtn').addEventListener('click', () => this.showProductModal());
        document.getElementById('searchBtn').addEventListener('click', () => this.searchInventory());
        document.getElementById('inventorySearch').addEventListener('input', () => this.searchInventory());
        document.getElementById('saveProductBtn').addEventListener('click', () => this.saveProduct());
        document.getElementById('cancelProductBtn').addEventListener('click', () => this.hideProductModal());

        // 입출고 - 새로운 시스템 (자동 스캔)
        let barcodeTimeout;
        document.getElementById('barcodeInput').addEventListener('input', (e) => {
            const barcode = e.target.value.trim();
            
            // 이전 타임아웃 클리어
            if (barcodeTimeout) {
                clearTimeout(barcodeTimeout);
            }
            
            // 바코드가 3자리 이상이면 자동 처리 (500ms 딜레이)
            if (barcode.length >= 3) {
                barcodeTimeout = setTimeout(() => {
                    this.handleBarcodeScanned(barcode);
                    e.target.value = ''; // 입력 필드 초기화
                }, 500);
            }
        });
        
        // 엔터키로도 처리 가능
        document.getElementById('barcodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (barcodeTimeout) {
                    clearTimeout(barcodeTimeout);
                }
                this.handleBarcodeScanned(e.target.value);
                e.target.value = '';
            }
        });
        document.getElementById('inTypeBtn').addEventListener('click', () => this.setTransactionType('in'));
        document.getElementById('outTypeBtn').addEventListener('click', () => this.setTransactionType('out'));
        document.getElementById('processInBtn').addEventListener('click', () => this.processBatchTransaction('in'));
        document.getElementById('processOutBtn').addEventListener('click', () => this.processBatchTransaction('out'));
        document.getElementById('clearListBtn').addEventListener('click', () => this.clearScannedProducts());

        // 포장
        document.getElementById('packingBarcode').addEventListener('input', (e) => this.handlePackingBarcodeInput(e.target.value));
        document.getElementById('packBtn').addEventListener('click', () => this.processPacking(true)); // 포장 (증가)
        document.getElementById('shipBtn').addEventListener('click', () => this.processPacking(false)); // 출고 (차감)
        document.getElementById('refreshPackingBtn').addEventListener('click', () => {
            console.log('상품목록 수동 새로고침 시작');
            this.updateProductSelectors(false); // 수동 새로고침 시에는 선택값 보존하지 않음
            alert('상품목록을 새로고침했습니다.');
        });

        // 업무 루틴
        document.getElementById('addTaskBtn').addEventListener('click', () => this.showTaskModal());
        document.getElementById('saveTaskBtn').addEventListener('click', () => this.saveTask());
        document.getElementById('cancelTaskBtn').addEventListener('click', () => this.hideTaskModal());

        // 모달 닫기
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // 모달 외부 클릭 시 닫기
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    showSection(sectionName) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');
    }

    toggleAdminMode(enabled) {
        this.isAdminMode = enabled;
        const adminBtn = document.getElementById('adminBtn');
        
        if (enabled) {
            document.body.classList.add('admin-mode');
            adminBtn.classList.add('active');
            adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> 관리자 모드 (ON)';
        } else {
            document.body.classList.remove('admin-mode');
            adminBtn.classList.remove('active');
            adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> 관리자 모드';
        }
        
        this.updateAttendanceDisplay();
        this.updateTaskDisplay();
    }

    // 내역 필터 초기화
    initializeHistoryFilters() {
        this.initializeTransactionFilter();
        this.initializePackingFilter();
    }
    
    // 입출고 내역 필터 초기화
    initializeTransactionFilter() {
        const yearFilter = document.getElementById('transactionYearFilter');
        const monthFilter = document.getElementById('transactionMonthFilter');
        const dayFilter = document.getElementById('transactionDayFilter');
        
        if (!yearFilter || !monthFilter || !dayFilter) return;
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        // 년도 필터 (2025-2035년)
        yearFilter.innerHTML = '<option value="">전체 년도</option>';
        for (let year = 2025; year <= 2035; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            if (year === currentYear) {
                option.selected = true; // 현재 년도 자동 선택
            }
            yearFilter.appendChild(option);
        }
        
        // 월 필터
        monthFilter.innerHTML = '<option value="">전체 월</option>';
        for (let month = 1; month <= 12; month++) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = `${month}월`;
            if (month === currentMonth) {
                option.selected = true; // 현재 월 자동 선택
            }
            monthFilter.appendChild(option);
        }
        
        // 일 필터
        dayFilter.innerHTML = '<option value="">전체 일</option>';
        for (let day = 1; day <= 31; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = `${day}일`;
            dayFilter.appendChild(option);
        }
        
        console.log(`입출고 내역 필터 초기화: ${currentYear}년 ${currentMonth}월로 자동 설정`);
    }
    
    // 포장 내역 필터 초기화
    initializePackingFilter() {
        const yearFilter = document.getElementById('packingYearFilter');
        const monthFilter = document.getElementById('packingMonthFilter');
        const dayFilter = document.getElementById('packingDayFilter');
        
        if (!yearFilter || !monthFilter || !dayFilter) return;
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        
        // 년도 필터 (2025-2035년) - 현재 년도 자동 선택
        yearFilter.innerHTML = '<option value="">전체 년도</option>';
        for (let year = 2025; year <= 2035; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            if (year === currentYear) {
                option.selected = true; // 현재 년도 자동 선택
            }
            yearFilter.appendChild(option);
        }
        
        // 월 필터 - 현재 월 자동 선택
        monthFilter.innerHTML = '<option value="">전체 월</option>';
        for (let month = 1; month <= 12; month++) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = `${month}월`;
            if (month === currentMonth) {
                option.selected = true; // 현재 월 자동 선택
            }
            monthFilter.appendChild(option);
        }
        
        // 일 필터 - 현재 일 자동 선택
        dayFilter.innerHTML = '<option value="">전체 일</option>';
        for (let day = 1; day <= 31; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = `${day}일`;
            if (day === currentDay) {
                option.selected = true; // 현재 일 자동 선택
            }
            dayFilter.appendChild(option);
        }
        
        console.log(`포장 내역 필터 초기화: ${currentYear}년 ${currentMonth}월 ${currentDay}일로 자동 설정`);
    }

    // 날짜/시간 선택기 초기화
    initializeTimeSelector() {
        this.initializeDateSelector();
        this.initializeHourMinuteSelector();
    }
    
    // 날짜 선택기 초기화
    initializeDateSelector() {
        const yearSelector = document.getElementById('attendanceYear');
        const monthSelector = document.getElementById('attendanceMonth');
        const daySelector = document.getElementById('attendanceDay');
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        
        // 년도 옵션 생성 (현재 년도 ±2년)
        yearSelector.innerHTML = '<option value="">년도</option>';
        for (let year = currentYear - 2; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            yearSelector.appendChild(option);
        }
        yearSelector.value = currentYear;
        
        // 월 옵션 생성
        monthSelector.innerHTML = '<option value="">월</option>';
        for (let month = 1; month <= 12; month++) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = `${month}월`;
            monthSelector.appendChild(option);
        }
        monthSelector.value = currentMonth;
        
        // 일 옵션 생성
        this.updateAttendanceDaySelector();
        daySelector.value = currentDay;
        
        // 년/월 변경 시 일 옵션 업데이트
        yearSelector.addEventListener('change', () => this.updateAttendanceDaySelector());
        monthSelector.addEventListener('change', () => this.updateAttendanceDaySelector());
    }
    
    // 출퇴근용 일 선택기 업데이트
    updateAttendanceDaySelector() {
        const yearSelector = document.getElementById('attendanceYear');
        const monthSelector = document.getElementById('attendanceMonth');
        const daySelector = document.getElementById('attendanceDay');
        
        const year = parseInt(yearSelector.value);
        const month = parseInt(monthSelector.value);
        
        if (!year || !month) {
            daySelector.innerHTML = '<option value="">일</option>';
            return;
        }
        
        const currentValue = daySelector.value;
        const daysInMonth = new Date(year, month, 0).getDate();
        
        daySelector.innerHTML = '<option value="">일</option>';
        for (let day = 1; day <= daysInMonth; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = `${day}일`;
            daySelector.appendChild(option);
        }
        
        // 이전 선택값 복원 (가능한 경우)
        if (currentValue && currentValue <= daysInMonth) {
            daySelector.value = currentValue;
        }
    }
    
    // 시간/분 선택기 초기화
    initializeHourMinuteSelector() {
        const hourSelector = document.getElementById('attendanceHour');
        const minuteSelector = document.getElementById('attendanceMinute');
        
        // 시간 옵션 생성
        hourSelector.innerHTML = '<option value="">시</option>';
        for (let hour = 0; hour < 24; hour++) {
            const option = document.createElement('option');
            option.value = hour.toString().padStart(2, '0');
            option.textContent = `${hour.toString().padStart(2, '0')}시`;
            hourSelector.appendChild(option);
        }
        
        // 분 옵션 생성 (10분 단위)
        minuteSelector.innerHTML = '<option value="">분</option>';
        for (let minute = 0; minute < 60; minute += 10) {
            const option = document.createElement('option');
            option.value = minute.toString().padStart(2, '0');
            option.textContent = `${minute.toString().padStart(2, '0')}분`;
            minuteSelector.appendChild(option);
        }
        
        // 현재 시간으로 설정
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = Math.floor(now.getMinutes() / 10) * 10;
        
        hourSelector.value = currentHour.toString().padStart(2, '0');
        minuteSelector.value = currentMinute.toString().padStart(2, '0');
    }

    // 날짜 필터 초기화
    initializeDateFilters() {
        const yearFilter = document.getElementById('yearFilter');
        const monthFilter = document.getElementById('monthFilter');
        const dayFilter = document.getElementById('dayFilter');
        
        // 현재 날짜 정보 가져오기
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        // 년도 필터 (현재 년도 기준 ±2년)
        yearFilter.innerHTML = '<option value="">전체</option>';
        for (let year = currentYear - 2; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            yearFilter.appendChild(option);
        }
        // 현재 연도로 기본 설정
        yearFilter.value = currentYear;

        // 월 필터
        monthFilter.innerHTML = '<option value="">전체</option>';
        for (let month = 1; month <= 12; month++) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = `${month}월`;
            monthFilter.appendChild(option);
        }
        // 현재 월로 설정
        monthFilter.value = currentMonth;

        // 일 필터
        this.updateDayFilter();
        
        // 현재 일로 설정 (일 필터 업데이트 후)
        setTimeout(() => {
            const dayFilter = document.getElementById('dayFilter');
            const currentDay = now.getDate();
            if (dayFilter) {
                dayFilter.value = currentDay;
            }
        }, 100);
        
        // 년/월 변경 시 일 필터 업데이트
        yearFilter.addEventListener('change', () => this.updateDayFilter());
        monthFilter.addEventListener('change', () => this.updateDayFilter());
    }

    updateDayFilter() {
        const yearFilter = document.getElementById('yearFilter');
        const monthFilter = document.getElementById('monthFilter');
        const dayFilter = document.getElementById('dayFilter');
        
        dayFilter.innerHTML = '<option value="">전체</option>';
        
        if (yearFilter.value && monthFilter.value) {
            const year = parseInt(yearFilter.value);
            const month = parseInt(monthFilter.value);
            const daysInMonth = new Date(year, month, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                const option = document.createElement('option');
                option.value = day;
                option.textContent = `${day}일`;
                dayFilter.appendChild(option);
            }
        }
    }

    // 출근 처리
    async checkIn() {
        const yearSelector = document.getElementById('attendanceYear');
        const monthSelector = document.getElementById('attendanceMonth');
        const daySelector = document.getElementById('attendanceDay');
        const hourSelector = document.getElementById('attendanceHour');
        const minuteSelector = document.getElementById('attendanceMinute');
        
        if (!yearSelector.value || !monthSelector.value || !daySelector.value) {
            alert('날짜를 모두 선택해주세요.');
            return;
        }
        
        if (!hourSelector.value || !minuteSelector.value) {
            alert('시간과 분을 모두 선택해주세요.');
            return;
        }
        
        const selectedTime = `${hourSelector.value}:${minuteSelector.value}`;
        const selectedDate = `${yearSelector.value}-${monthSelector.value.toString().padStart(2, '0')}-${daySelector.value.toString().padStart(2, '0')}`;
        
        console.log('출근 처리 시작:', { selectedTime, selectedDate });
        
        // 선택한 날짜에 이미 출근했는지 확인
        const existingRecord = this.attendanceRecords.find(record => 
            record.date === selectedDate && (record.check_in || record.checkIn)
        );
        
        if (existingRecord && !(existingRecord.check_out || existingRecord.checkOut)) {
            alert('해당 날짜에 이미 출근 처리되었습니다.');
            return;
        }
        
        // 새로운 출근 기록 생성
        const newRecord = {
            id: Date.now(),
            date: selectedDate,
            check_in: selectedTime + ':00', // TIME 형식에 맞춰 초 추가
            check_out: null,
            work_hours: 0
        };
        
        console.log('새 출근 기록:', newRecord);
        
        this.attendanceRecords.push(newRecord);
        
        try {
            await this.saveData();
            this.updateAttendanceDisplay();
            alert(`출근 처리 완료!\n날짜: ${selectedDate}\n시간: ${selectedTime}`);
            console.log('출근 처리 완료');
        } catch (error) {
            console.error('출근 처리 오류:', error);
            alert('출근 처리 중 오류가 발생했습니다.');
        }
    }

    // 퇴근 처리
    async checkOut() {
        const yearSelector = document.getElementById('attendanceYear');
        const monthSelector = document.getElementById('attendanceMonth');
        const daySelector = document.getElementById('attendanceDay');
        const hourSelector = document.getElementById('attendanceHour');
        const minuteSelector = document.getElementById('attendanceMinute');
        
        if (!yearSelector.value || !monthSelector.value || !daySelector.value) {
            alert('날짜를 모두 선택해주세요.');
            return;
        }
        
        if (!hourSelector.value || !minuteSelector.value) {
            alert('시간과 분을 모두 선택해주세요.');
            return;
        }
        
        const selectedTime = `${hourSelector.value}:${minuteSelector.value}`;
        const selectedDate = `${yearSelector.value}-${monthSelector.value.toString().padStart(2, '0')}-${daySelector.value.toString().padStart(2, '0')}`;
        
        console.log('퇴근 처리 시작:', { selectedTime, selectedDate });
        
        // 선택한 날짜에 출근했지만 퇴근하지 않은 기록 찾기
        const record = this.attendanceRecords.find(record => 
            record.date === selectedDate && (record.checkIn || record.check_in) && !(record.checkOut || record.check_out)
        );
        
        if (!record) {
            alert('해당 날짜에 출근 기록이 없습니다. 먼저 출근 처리를 해주세요.');
            return;
        }
        
        console.log('퇴근 처리할 기록:', record);
        
        record.check_out = selectedTime + ':00'; // TIME 형식에 맞춰 초 추가
        record.work_hours = this.calculateWorkHours(record.check_in || record.checkIn, selectedTime);
        
        // 표시용 속성도 업데이트 (로컬 표시용)
        record.checkOut = selectedTime;
        record.workHours = record.work_hours;
        
        try {
            await this.saveData();
            this.updateAttendanceDisplay();
            const workHours = Math.floor(record.work_hours / 60);
            const workMinutes = record.work_hours % 60;
            alert(`퇴근 처리 완료!\n날짜: ${selectedDate}\n퇴근시간: ${selectedTime}\n근무시간: ${workHours}시간 ${workMinutes}분`);
            console.log('퇴근 처리 완료');
        } catch (error) {
            console.error('퇴근 처리 오류:', error);
            alert('퇴근 처리 중 오류가 발생했습니다.');
        }
    }

    // 근무시간 계산
    calculateWorkHours(checkIn, checkOut) {
        const [inHour, inMinute] = checkIn.split(':').map(Number);
        const [outHour, outMinute] = checkOut.split(':').map(Number);
        
        const inTime = inHour * 60 + inMinute;
        let outTime = outHour * 60 + outMinute;
        
        // 다음 날 퇴근인 경우
        if (outTime < inTime) {
            outTime += 24 * 60;
        }
        
        return outTime - inTime; // 분 단위 반환
    }

    // 시간 포맷 (분 -> 시간:분)
    formatMinutes(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}시간 ${mins}분`;
    }

    // 시간 표시 형식 변환 (00:40:00 -> 00:40)
    formatTime(timeString) {
        if (!timeString) return '';
        if (timeString.includes(':')) {
            const parts = timeString.split(':');
            return `${parts[0]}:${parts[1]}`; // 초 부분 제거
        }
        return timeString;
    }

    // 출퇴근 기록 필터링
    filterAttendance() {
        this.updateAttendanceDisplay();
    }

    // 출퇴근 기록 표시 업데이트
    updateAttendanceDisplay() {
        console.log('updateAttendanceDisplay 시작, 데이터:', this.attendanceRecords);
        
        const tbody = document.querySelector('#attendanceTable tbody');
        if (!tbody) {
            console.error('출퇴근 테이블 tbody를 찾을 수 없음');
            return;
        }
        
        const yearFilter = document.getElementById('yearFilter');
        const monthFilter = document.getElementById('monthFilter');
        const dayFilter = document.getElementById('dayFilter');
        
        if (!yearFilter || !monthFilter || !dayFilter) {
            console.error('날짜 필터 요소를 찾을 수 없음');
            return;
        }
        
        // 데이터가 아직 로드되지 않았으면 빈 배열로 초기화
        if (!this.attendanceRecords) {
            this.attendanceRecords = [];
        }
        
        let filteredRecords = this.attendanceRecords;
        console.log('필터링 전 레코드 수:', filteredRecords.length);
        
        // 필터 적용
        const yearValue = yearFilter.value;
        const monthValue = monthFilter.value;
        const dayValue = dayFilter.value;
        
        console.log('필터 값들:', { yearValue, monthValue, dayValue });
        
        if (yearValue || monthValue || dayValue) {
            filteredRecords = this.attendanceRecords.filter(record => {
                const recordDate = new Date(record.date);
                const recordYear = recordDate.getFullYear();
                const recordMonth = recordDate.getMonth() + 1;
                const recordDay = recordDate.getDate();
                
                console.log('레코드 날짜 정보:', { record: record.date, recordYear, recordMonth, recordDay });
                
                if (yearValue && recordYear !== parseInt(yearValue)) return false;
                if (monthValue && recordMonth !== parseInt(monthValue)) return false;
                if (dayValue && recordDay !== parseInt(dayValue)) return false;
                
                return true;
            });
        }
        
        // 최신 순으로 정렬
        filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('필터링 후 레코드 수:', filteredRecords.length);
        console.log('필터링된 레코드들:', filteredRecords);
        
        tbody.innerHTML = '';
        
        if (filteredRecords.length === 0) {
            console.log('표시할 출퇴근 기록이 없음');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">출퇴근 기록이 없습니다.</td></tr>';
        } else {
            console.log('출퇴근 기록 테이블 생성 시작');
        }
        
        filteredRecords.forEach((record, index) => {
            console.log(`레코드 ${index + 1} 처리 중:`, record);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.date}</td>
                <td>${this.formatTime(record.check_in || record.checkIn) || '-'}</td>
                <td>${this.formatTime(record.check_out || record.checkOut) || '-'}</td>
                <td>${(record.work_hours || record.workHours) ? this.formatMinutes(record.work_hours || record.workHours) : '-'}</td>
                <td class="admin-only" style="display: ${this.isAdminMode ? 'table-cell' : 'none'}">
                    <button class="btn btn-danger" onclick="logisticsManager.deleteAttendanceRecord(${record.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // 통계 계산
        this.updateAttendanceStats(filteredRecords);
    }

    // 출퇴근 통계 업데이트
    updateAttendanceStats(records) {
        const completedRecords = records.filter(record => record.check_out || record.checkOut);
        const totalMinutes = completedRecords.reduce((sum, record) => sum + (record.work_hours || record.workHours || 0), 0);
        const avgMinutes = completedRecords.length > 0 ? Math.round(totalMinutes / completedRecords.length) : 0;
        
        document.getElementById('totalHours').textContent = this.formatMinutes(totalMinutes);
        document.getElementById('avgHours').textContent = this.formatMinutes(avgMinutes);
    }

    // 출퇴근 기록 삭제 (관리자 전용)
    deleteAttendanceRecord(id) {
        if (!this.isAdminMode) return;
        
        if (confirm('정말로 이 기록을 삭제하시겠습니까?')) {
            this.attendanceRecords = this.attendanceRecords.filter(record => record.id !== id);
            this.saveData();
            this.updateAttendanceDisplay();
        }
    }

    // 상품 모달 표시
    showProductModal(product = null) {
        this.currentEditingProduct = product;
        const modal = document.getElementById('productModal');
        const title = document.getElementById('productModalTitle');
        
        if (product) {
            title.textContent = '상품 수정';
            document.getElementById('productBarcode').value = product.barcode;
            document.getElementById('productName').value = product.name;
            document.getElementById('productQuantity').value = product.quantity;
            document.getElementById('productGrossQty').value = product.gross_qty || 0;
            document.getElementById('productUnit').value = product.unit;
        } else {
            title.textContent = '상품 추가';
            document.getElementById('productBarcode').value = '';
            document.getElementById('productName').value = '';
            document.getElementById('productQuantity').value = '0';
            document.getElementById('productGrossQty').value = '0';
            document.getElementById('productUnit').value = '개';
        }
        
        modal.style.display = 'block';
    }

    hideProductModal() {
        document.getElementById('productModal').style.display = 'none';
        this.currentEditingProduct = null;
    }

    // 상품 저장
    saveProduct() {
        const barcode = document.getElementById('productBarcode').value.trim();
        const name = document.getElementById('productName').value.trim();
        const quantity = parseInt(document.getElementById('productQuantity').value) || 0;
        const grossQty = parseInt(document.getElementById('productGrossQty').value) || 0;
        const unit = document.getElementById('productUnit').value.trim();
        
        if (!barcode || !name) {
            alert('바코드와 상품명을 입력해주세요.');
            return;
        }
        
        // 바코드 중복 확인 (편집 중인 상품 제외)
        const existingProduct = this.inventory.find(product => 
            product.barcode === barcode && product.id !== (this.currentEditingProduct?.id)
        );
        
        if (existingProduct) {
            alert('이미 존재하는 바코드입니다.');
            return;
        }
        
        if (this.currentEditingProduct) {
            // 상품 수정
            const product = this.inventory.find(p => p.id === this.currentEditingProduct.id);
            product.barcode = barcode;
            product.name = name;
            product.quantity = quantity;
            product.gross_qty = grossQty;
            product.unit = unit;
        } else {
            // 새 상품 추가
            const newProduct = {
                id: Date.now(),
                barcode,
                name,
                quantity,
                gross_qty: grossQty,
                unit
            };
            this.inventory.push(newProduct);
        }
        
        this.saveData();
        this.updateInventoryDisplay();
        // 상품 추가/수정 후에만 선택기 업데이트 (선택값 보존)
        this.updateProductSelectors(true);
        this.hideProductModal();
    }

    // 재고 검색
    searchInventory() {
        const searchTerm = document.getElementById('inventorySearch').value.toLowerCase();
        this.updateInventoryDisplay(searchTerm);
    }

    // 재고 목록 표시 업데이트
    updateInventoryDisplay(searchTerm = '') {
        const tbody = document.querySelector('#inventoryTable tbody');
        if (!tbody) return;
        
        // 데이터가 아직 로드되지 않았으면 빈 배열로 초기화
        if (!this.inventory) {
            this.inventory = [];
        }
        
        let filteredInventory = this.inventory;
        
        if (searchTerm) {
            filteredInventory = this.inventory.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.barcode.toLowerCase().includes(searchTerm)
            );
        }
        
        tbody.innerHTML = '';
        filteredInventory.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.barcode}</td>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>${product.gross_qty || 0}</td>
                <td>${product.unit}</td>
                <td>
                    <button class="btn btn-info" onclick="logisticsManager.showProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="logisticsManager.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="logisticsManager.showProductHistory(${product.id})">
                        <i class="fas fa-history"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // 상품 삭제
    deleteProduct(id) {
        if (confirm('정말로 이 상품을 삭제하시겠습니까?')) {
            this.inventory = this.inventory.filter(product => product.id !== id);
            this.saveData();
                    this.updateInventoryDisplay();
        this.updateProductSelectors();
    }

    // 상품별 입출고 내역 표시
    showProductHistory(productId) {
        const product = this.inventory.find(p => p.id === productId);
        if (!product) {
            alert('상품을 찾을 수 없습니다.');
            return;
        }

        // 모달 제목 설정
        document.getElementById('productHistoryModalTitle').textContent = `${product.name} 입출고 내역`;
        
        // 날짜 필터 초기화 (오늘 날짜로 설정)
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('startDate').value = today;
        document.getElementById('endDate').value = today;
        
        // 해당 상품의 입출고 내역 필터링
        this.currentProductHistory = productId;
        this.updateProductHistoryDisplay();
        
        // 모달 표시
        document.getElementById('productHistoryModal').style.display = 'block';
    }

    // 상품별 입출고 내역 업데이트
    updateProductHistoryDisplay() {
        const tbody = document.querySelector('#productHistoryTable tbody');
        if (!tbody) return;

        // 해당 상품의 거래 내역만 필터링
        let productTransactions = this.transactions.filter(transaction => 
            transaction.productId === this.currentProductHistory
        );

        // 날짜 필터 적용
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (startDate && endDate) {
            productTransactions = productTransactions.filter(transaction => {
                const transactionDate = this.parseKoreanDate(transaction.timestamp);
                if (!transactionDate) return false;
                
                const transactionDateStr = transactionDate.toISOString().split('T')[0];
                return transactionDateStr >= startDate && transactionDateStr <= endDate;
            });
        }

        // 최신순으로 정렬
        productTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        tbody.innerHTML = '';

        if (productTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">해당 기간의 입출고 내역이 없습니다.</td></tr>';
            return;
        }

        productTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.timestamp}</td>
                <td>${transaction.productName || transaction.product_name}</td>
                <td>${transaction.type}</td>
                <td>${transaction.quantity}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // 한국 날짜 형식 파싱
    parseKoreanDate(dateStr) {
        const match = dateStr.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
        if (!match) return null;
        
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // JavaScript 월은 0부터 시작
        const day = parseInt(match[3]);
        
        return new Date(year, month, day);
    }
    }

    // 상품 선택기 업데이트 (현재 선택값 보존)
    updateProductSelectors(preserveSelection = true) {
        const selectors = ['packingProduct']; 
        
        console.log('상품 선택기 업데이트 시작, 재고 데이터:', this.inventory);
        
        // 데이터가 아직 로드되지 않았으면 빈 배열로 초기화
        if (!this.inventory) {
            this.inventory = [];
            console.log('재고 데이터가 없어서 빈 배열로 초기화');
        }
        
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (!selector) {
                console.error(`선택기를 찾을 수 없음: ${selectorId}`);
                return;
            }
            
            // 현재 선택된 값 저장 (보존 옵션이 true인 경우)
            const currentValue = preserveSelection ? selector.value : '';
            console.log(`${selectorId} 현재 선택값:`, currentValue);
            
            console.log(`${selectorId} 선택기 업데이트 중...`);
            selector.innerHTML = '<option value="">상품을 선택하세요</option>';
            
            if (this.inventory.length === 0) {
                console.log('재고 데이터가 비어있음');
                const noDataOption = document.createElement('option');
                noDataOption.value = '';
                noDataOption.textContent = '재고 데이터가 없습니다';
                noDataOption.disabled = true;
                selector.appendChild(noDataOption);
                return;
            }
            
            this.inventory.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                const grossQty = product.gross_qty || 0;
                option.textContent = `${product.name} - 재고: ${product.quantity}개 / 그로스: ${grossQty}개`;
                selector.appendChild(option);
                console.log(`상품 추가됨: ${product.name} (ID: ${product.id})`);
            });
            
            // 이전 선택값 복원 (해당 상품이 여전히 존재하는 경우)
            if (preserveSelection && currentValue) {
                const optionExists = Array.from(selector.options).some(option => option.value === currentValue);
                if (optionExists) {
                    selector.value = currentValue;
                    console.log(`${selectorId} 이전 선택값 복원됨:`, currentValue);
                } else {
                    console.log(`${selectorId} 이전 선택값이 더 이상 존재하지 않음:`, currentValue);
                }
            }
            
            console.log(`${selectorId} 선택기 업데이트 완료, 총 ${this.inventory.length}개 상품`);
        });
    }

    // 거래 유형 설정
    setTransactionType(type) {
        this.currentTransactionType = type;
        
        // 버튼 상태 업데이트
        document.getElementById('inTypeBtn').classList.toggle('active', type === 'in');
        document.getElementById('outTypeBtn').classList.toggle('active', type === 'out');
        
        // 처리 버튼 표시 업데이트
        this.updateProcessButtons();
    }

    // 바코드 스캔 처리
    handleBarcodeScanned(barcode) {
        if (!barcode.trim()) return;
        
        console.log('바코드 스캔:', barcode);
        
        // 상품 찾기
        const product = this.inventory.find(p => p.barcode === barcode.trim());
        if (!product) {
            alert('해당 바코드의 상품을 찾을 수 없습니다.');
            return;
        }
        
        // 이미 스캔된 상품인지 확인
        const existingItem = this.scannedProducts.find(item => item.productId === product.id);
        if (existingItem) {
            // 수량 증가
            existingItem.quantity += 1;
        } else {
            // 새 상품 추가
            this.scannedProducts.push({
                productId: product.id,
                productName: product.name,
                barcode: product.barcode,
                quantity: 1,
                unit: product.unit
            });
        }
        
        this.updateScannedProductsDisplay();
        this.updateProcessButtons();
        
        // 스캔 완료 피드백
        const barcodeInput = document.getElementById('barcodeInput');
        barcodeInput.style.borderColor = '#27ae60';
        setTimeout(() => {
            barcodeInput.style.borderColor = '#3498db';
        }, 500);
    }

    // 스캔된 상품 목록 표시 업데이트
    updateScannedProductsDisplay() {
        const container = document.getElementById('scannedProducts');
        
        if (this.scannedProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-barcode"></i>
                    <p>바코드를 스캔하여 상품을 추가하세요</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        this.scannedProducts.forEach((item, index) => {
            const productDiv = document.createElement('div');
            productDiv.className = 'product-item';
            productDiv.innerHTML = `
                <div class="product-info">
                    <div class="product-name">${item.productName}</div>
                    <div class="product-details">바코드: ${item.barcode} | 단위: ${item.unit}</div>
                </div>
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="logisticsManager.changeProductQuantity(${index}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="logisticsManager.changeProductQuantity(${index}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="remove-btn" onclick="logisticsManager.removeScannedProduct(${index})">
                        <i class="fas fa-trash"></i> 제거
                    </button>
                </div>
            `;
            container.appendChild(productDiv);
        });
    }

    // 상품 수량 변경
    changeProductQuantity(index, change) {
        if (index < 0 || index >= this.scannedProducts.length) return;
        
        this.scannedProducts[index].quantity += change;
        
        if (this.scannedProducts[index].quantity <= 0) {
            this.scannedProducts.splice(index, 1);
        }
        
        this.updateScannedProductsDisplay();
        this.updateProcessButtons();
    }

    // 스캔된 상품 제거
    removeScannedProduct(index) {
        if (index < 0 || index >= this.scannedProducts.length) return;
        
        this.scannedProducts.splice(index, 1);
        this.updateScannedProductsDisplay();
        this.updateProcessButtons();
    }

    // 처리 버튼 상태 업데이트
    updateProcessButtons() {
        const hasProducts = this.scannedProducts.length > 0;
        
        document.getElementById('processInBtn').style.display = 
            (hasProducts && this.currentTransactionType === 'in') ? 'block' : 'none';
        document.getElementById('processOutBtn').style.display = 
            (hasProducts && this.currentTransactionType === 'out') ? 'block' : 'none';
        document.getElementById('clearListBtn').style.display = hasProducts ? 'block' : 'none';
    }

    // 일괄 거래 처리
    async processBatchTransaction(type) {
        if (this.scannedProducts.length === 0) {
            alert('처리할 상품이 없습니다.');
            return;
        }
        
        const typeName = type === 'in' ? '입고' : '출고';
        
        if (!confirm(`${this.scannedProducts.length}개 상품을 ${typeName} 처리하시겠습니까?`)) {
            return;
        }
        
        try {
            for (const item of this.scannedProducts) {
                const product = this.inventory.find(p => p.id === item.productId);
                if (!product) continue;
                
                // 출고시 재고 확인
                if (type === 'out' && product.quantity < item.quantity) {
                    alert(`${product.name}의 재고가 부족합니다. (현재: ${product.quantity}, 요청: ${item.quantity})`);
                    return;
                }
                
                // 재고 업데이트
                if (type === 'in') {
                    product.quantity += item.quantity;
                } else {
                    product.quantity -= item.quantity;
                }
                
                // 거래 기록 추가 (각 상품별로 개별 기록, 현재 시간으로)
                const currentTime = new Date().toLocaleString('ko-KR');
                const transaction = {
                    id: Date.now() + Math.random(), // 고유 ID 생성
                    productId: product.id,
                    productName: product.name,
                    product_name: product.name, // Supabase 호환성
                    type: type === 'in' ? '입고' : '출고',
                    quantity: item.quantity,
                    timestamp: currentTime
                };
                
                this.transactions.push(transaction);
                console.log(`일괄 거래 기록 추가: ${product.name} ${type === 'in' ? '입고' : '출고'} ${item.quantity}개 (${currentTime})`);
            }
            
            await this.saveData();
            this.updateInventoryDisplay();
            this.updateTransactionHistory();
            
            const totalItems = this.scannedProducts.reduce((sum, item) => sum + item.quantity, 0);
            alert(`${typeName} 처리 완료! 총 ${totalItems}개 상품이 처리되었습니다.`);
            
            this.clearScannedProducts();
            
        } catch (error) {
            console.error('거래 처리 오류:', error);
            alert('거래 처리 중 오류가 발생했습니다.');
        }
    }

    // 스캔된 상품 목록 초기화
    clearScannedProducts() {
        this.scannedProducts = [];
        this.updateScannedProductsDisplay();
        this.updateProcessButtons();
    }

    // 바코드 입력 처리
    handleBarcodeInput(barcode) {
        if (barcode.length > 3) { // 바코드가 입력되면
            const product = this.inventory.find(p => p.barcode === barcode);
            if (product) {
                document.getElementById('productSelect').value = product.id;
            }
        }
    }

    // 입출고 처리
    processTransaction() {
        const barcodeInput = document.getElementById('barcodeInput').value.trim();
        const productId = document.getElementById('productSelect').value;
        const quantity = parseInt(document.getElementById('quantityInput').value) || 0;
        const type = document.getElementById('transactionType').value;
        
        if (!productId || quantity <= 0) {
            alert('상품과 수량을 올바르게 입력해주세요.');
            return;
        }
        
        const product = this.inventory.find(p => p.id === parseInt(productId));
        if (!product) {
            alert('상품을 찾을 수 없습니다.');
            return;
        }
        
        // 출고시 재고 확인
        if (type === 'out' && product.quantity < quantity) {
            alert('재고가 부족합니다.');
            return;
        }
        
        // 재고 업데이트
        if (type === 'in') {
            product.quantity += quantity;
        } else {
            product.quantity -= quantity;
        }
        
        // 거래 기록 추가
        const transaction = {
            id: Date.now(),
            productId: product.id,
            productName: product.name,
            product_name: product.name, // Supabase 호환성
            type: type === 'in' ? '입고' : '출고',
            quantity,
            timestamp: new Date().toLocaleString('ko-KR')
        };
        
        this.transactions.push(transaction);
        console.log(`개별 거래 기록 추가: ${product.name} ${type === 'in' ? '입고' : '출고'} ${quantity}개`);
        this.saveData();
        this.updateInventoryDisplay();
        this.updateTransactionHistory();
        
        // 폼 초기화
        document.getElementById('barcodeInput').value = '';
        document.getElementById('productSelect').value = '';
        document.getElementById('quantityInput').value = '1';
        
        alert(`${transaction.type} 처리가 완료되었습니다.`);
    }

    // 거래 내역 업데이트 (필터링 지원)
    updateTransactionHistory(filteredTransactions = null) {
        const tbody = document.querySelector('#transactionTable tbody');
        if (!tbody) return;
        
        // 데이터가 아직 로드되지 않았으면 빈 배열로 초기화
        if (!this.transactions) {
            this.transactions = [];
        }
        
        console.log('입출고 내역 업데이트:', { 
            totalTransactions: this.transactions.length, 
            filteredTransactions: filteredTransactions ? filteredTransactions.length : null,
            transactions: this.transactions 
        });
        
        let transactionsToShow = filteredTransactions || this.transactions.slice(-5).reverse(); // 최근 5개만 표시
        
        tbody.innerHTML = '';
        
        if (transactionsToShow.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">거래 내역이 없습니다.</td></tr>';
            return;
        }
        
        // 개별 거래 기록 모두 표시 (그룹화 제거)
        transactionsToShow.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.timestamp}</td>
                <td>${transaction.productName || transaction.product_name || 'Unknown Product'}</td>
                <td>${transaction.type}</td>
                <td>${transaction.quantity}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // 상품별 거래 그룹화
    groupTransactionsByProduct(transactions) {
        const grouped = {};
        
        transactions.forEach(transaction => {
            const productName = transaction.productName || transaction.product_name || 'Unknown Product';
            const timestamp = transaction.timestamp;
            const type = transaction.type;
            const key = `${productName}-${timestamp}-${type}`;
            
            if (grouped[key]) {
                grouped[key].quantity += transaction.quantity;
            } else {
                grouped[key] = {
                    timestamp: timestamp,
                    productName: productName,
                    product_name: productName,
                    type: type,
                    quantity: transaction.quantity
                };
            }
        });
        
        return Object.values(grouped).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    // 입출고 내역 필터링
    filterTransactionHistory() {
        const yearFilter = document.getElementById('transactionYearFilter');
        const monthFilter = document.getElementById('transactionMonthFilter');
        const dayFilter = document.getElementById('transactionDayFilter');
        
        const year = yearFilter.value;
        const month = monthFilter.value;
        const day = dayFilter.value;
        
        console.log('입출고 내역 필터링:', { year, month, day });
        console.log('전체 거래 데이터:', this.transactions);
        
        if (!year && !month && !day) {
            // 필터가 없으면 전체 표시
            this.updateTransactionHistory();
            return;
        }
        
        const filteredTransactions = this.transactions.filter(transaction => {
            // 한국 시간 형식 (2025. 8. 29. 오후 3:30:45) 파싱
            const timestampStr = transaction.timestamp;
            console.log('거래 타임스탬프:', timestampStr);
            
            // 날짜 부분만 추출 (2025. 8. 29.)
            const dateMatch = timestampStr.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
            if (!dateMatch) {
                console.log('날짜 파싱 실패:', timestampStr);
                return false;
            }
            
            const transactionYear = parseInt(dateMatch[1]);
            const transactionMonth = parseInt(dateMatch[2]);
            const transactionDay = parseInt(dateMatch[3]);
            
            console.log('파싱된 날짜:', { transactionYear, transactionMonth, transactionDay });
            
            if (year && transactionYear !== parseInt(year)) return false;
            if (month && transactionMonth !== parseInt(month)) return false;
            if (day && transactionDay !== parseInt(day)) return false;
            
            return true;
        });
        
        console.log('필터링된 거래:', filteredTransactions);
        this.updateTransactionHistory(filteredTransactions);
    }

    // 포장 바코드 입력 처리
    handlePackingBarcodeInput(barcode) {
        if (barcode.length > 3) {
            const product = this.inventory.find(p => p.barcode === barcode);
            if (product) {
                const packingProductSelect = document.getElementById('packingProduct');
                if (packingProductSelect) {
                    // 옵션이 존재하는지 확인하고 설정
                    const option = packingProductSelect.querySelector(`option[value="${product.id}"]`);
                    if (option) {
                        packingProductSelect.value = product.id;
                    } else {
                        // 옵션이 없으면 상품 선택기 업데이트 후 설정 (선택값 보존하지 않음)
                        this.updateProductSelectors(false);
                        setTimeout(() => {
                            packingProductSelect.value = product.id;
                            console.log('바코드 스캔으로 상품 선택됨:', product.name);
                        }, 100);
                    }
                }
            }
        }
    }

    // 포장 처리 (isPacking: true=포장, false=출고)
    async processPacking(isPacking = true) {
        const productId = document.getElementById('packingProduct').value;
        const inputQuantity = parseInt(document.getElementById('packingQuantity').value) || 0;
        
        // 포장이면 양수, 출고면 음수로 변환
        const quantity = isPacking ? Math.abs(inputQuantity) : -Math.abs(inputQuantity);
        const actionName = isPacking ? '포장' : '출고';
        
        console.log(`그로스 ${actionName} 처리 시작:`, { productId, quantity });
        console.log('현재 재고 데이터:', this.inventory);
        
        if (!productId || productId === '') {
            alert('상품을 선택해주세요.');
            return;
        }
        
        if (inputQuantity <= 0) {
            alert('수량을 1 이상으로 입력해주세요.');
            return;
        }
        
        // 재고 데이터 확인
        if (!this.inventory || this.inventory.length === 0) {
            alert('재고 데이터가 없습니다. 먼저 상품을 등록해주세요.');
            return;
        }
        
        const product = this.inventory.find(p => p.id === parseInt(productId));
        console.log('선택된 상품:', product);
        
        if (!product) {
            alert(`상품을 찾을 수 없습니다. (ID: ${productId})`);
            return;
        }
        
        // 그로스 포장 수량 증감
        const currentGrossQty = product.gross_qty || 0;
        const newGrossQty = currentGrossQty + quantity;
        
        if (newGrossQty < 0) {
            alert(`그로스 포장 수량이 부족합니다.\n현재: ${currentGrossQty}개\n요청 ${actionName}: ${Math.abs(quantity)}개`);
            return;
        }
        
        product.gross_qty = newGrossQty;
        
        // 포장 기록 추가
        const packingRecord = {
            id: Date.now(),
            product_id: product.id,
            productId: product.id,
            product_name: product.name,
            productName: product.name,
            quantity: quantity,
            status: isPacking ? '포장완료' : '출고완료',
            timestamp: new Date().toLocaleString('ko-KR')
        };
        
        this.packingRecords.push(packingRecord);
        console.log('포장 기록 추가:', packingRecord);
        
        try {
            await this.saveData();
            this.updatePackingHistory();
            this.updateInventoryDisplay();
            
            // 폼 초기화
            document.getElementById('packingBarcode').value = '';
            document.getElementById('packingProduct').value = '';
            document.getElementById('packingQuantity').value = '1';
            
            alert(`그로스 ${actionName} 완료!\n- ${product.name}: ${Math.abs(quantity)}개 ${actionName}\n- 현재 그로스 포장: ${product.gross_qty}개`);
            console.log(`그로스 ${actionName} 처리 완료`);
        } catch (error) {
            console.error(`그로스 ${actionName} 처리 오류:`, error);
            alert(`그로스 ${actionName} 처리 중 오류가 발생했습니다.`);
        }
    }



    // 포장 내역 업데이트 (필터링 지원)
    updatePackingHistory(filteredRecords = null) {
        const tbody = document.querySelector('#packingTable tbody');
        if (!tbody) return;
        
        // 데이터가 아직 로드되지 않았으면 빈 배열로 초기화
        if (!this.packingRecords) {
            this.packingRecords = [];
        }
        
        console.log('포장 내역 업데이트:', { 
            totalRecords: this.packingRecords.length, 
            filteredRecords: filteredRecords ? filteredRecords.length : null,
            records: this.packingRecords 
        });
        
        let recordsToShow = filteredRecords || this.packingRecords.slice().reverse(); // 모든 데이터 표시 (최신순)
        
        tbody.innerHTML = '';
        
        if (recordsToShow.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">포장 내역이 없습니다.</td></tr>';
            return;
        }
        
        recordsToShow.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.timestamp}</td>
                <td>${record.productName || record.product_name || 'Unknown Product'}</td>
                <td>
                    <span class="status-badge ${record.status === '포장완료' ? 'status-packed' : 'status-shipped'}">
                        ${record.status}
                    </span>
                </td>
                <td>${record.quantity}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // 포장 내역 필터링
    filterPackingHistory() {
        const yearFilter = document.getElementById('packingYearFilter');
        const monthFilter = document.getElementById('packingMonthFilter');
        const dayFilter = document.getElementById('packingDayFilter');
        
        const year = yearFilter.value;
        const month = monthFilter.value;
        const day = dayFilter.value;
        
        if (!year && !month && !day) {
            // 필터가 없으면 전체 표시
            this.updatePackingHistory();
            return;
        }
        
        const filteredRecords = this.packingRecords.filter(record => {
            const recordDate = new Date(record.timestamp);
            
            if (year && recordDate.getFullYear() !== parseInt(year)) return false;
            if (month && (recordDate.getMonth() + 1) !== parseInt(month)) return false;
            if (day && recordDate.getDate() !== parseInt(day)) return false;
            
            return true;
        });
        
        this.updatePackingHistory(filteredRecords);
    }



    // 업무 모달 표시
    showTaskModal(task = null) {
        this.currentEditingTask = task;
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');
        
        if (task) {
            title.textContent = '업무 수정';
            document.getElementById('taskName').value = task.name;
            document.getElementById('taskDescription').value = task.description;
        } else {
            title.textContent = '업무 추가';
            document.getElementById('taskName').value = '';
            document.getElementById('taskDescription').value = '';
        }
        
        modal.style.display = 'block';
    }

    hideTaskModal() {
        document.getElementById('taskModal').style.display = 'none';
        this.currentEditingTask = null;
    }

    // 업무 저장
    saveTask() {
        const name = document.getElementById('taskName').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        
        if (!name) {
            alert('업무명을 입력해주세요.');
            return;
        }
        
        if (this.currentEditingTask) {
            // 업무 수정
            const task = this.tasks.find(t => t.id === this.currentEditingTask.id);
            task.name = name;
            task.description = description;
        } else {
            // 새 업무 추가
            const newTask = {
                id: Date.now(),
                name,
                description,
                completed: false
            };
            this.tasks.push(newTask);
        }
        
        this.saveData();
        this.updateTaskDisplay();
        this.hideTaskModal();
    }

    // 업무 목록 표시 업데이트
    updateTaskDisplay() {
        const taskList = document.getElementById('taskList');
        if (!taskList) return;
        
        // 데이터가 아직 로드되지 않았으면 빈 배열로 초기화
        if (!this.tasks) {
            this.tasks = [];
        }
        
        taskList.innerHTML = '';
        this.tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskItem.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="logisticsManager.toggleTask(${task.id})">
                    <div class="task-info">
                        <h4>${task.name}</h4>
                        <p>${task.description}</p>
                    </div>
                </div>
                <div class="task-actions admin-only" style="display: ${this.isAdminMode ? 'flex' : 'none'}">
                    <button class="btn btn-info" onclick="logisticsManager.showTaskModal(${JSON.stringify(task).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="logisticsManager.deleteTask(${task.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            taskList.appendChild(taskItem);
        });
        
        // 진행률 업데이트
        this.updateTaskProgress();
    }

    // 업무 진행률 업데이트
    updateTaskProgress() {
        if (!this.tasks || this.tasks.length === 0) {
            document.getElementById('progressFill').style.width = '0%';
            document.getElementById('progressPercentage').textContent = '0%';
            document.getElementById('progressStatus').textContent = '0/0 완료';
            return;
        }
        
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
        
        // 진행률 바 업데이트
        const progressFill = document.getElementById('progressFill');
        const progressPercentageEl = document.getElementById('progressPercentage');
        const progressStatusEl = document.getElementById('progressStatus');
        
        // 애니메이션 효과
        setTimeout(() => {
            progressFill.style.width = `${progressPercentage}%`;
        }, 100);
        
        progressPercentageEl.textContent = `${progressPercentage}%`;
        progressStatusEl.textContent = `${completedTasks}/${totalTasks} 완료`;
        
        // 완료 시 축하 효과 (중복 방지)
        if (completedTasks === totalTasks && totalTasks > 0) {
            if (!this.completionAlertShown) {
                this.celebrateCompletion();
                this.completionAlertShown = true;
            }
        } else {
            // 완료되지 않은 상태로 돌아가면 알림 플래그 리셋
            this.completionAlertShown = false;
        }
    }

    // 완료 축하 효과
    celebrateCompletion() {
        const progressFill = document.getElementById('progressFill');
        progressFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        
        // 3초 후 원래 색상으로 복원
        setTimeout(() => {
            progressFill.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
        }, 3000);
        
        // 완료 알림 (선택적)
        if (this.tasks.length > 0) {
            setTimeout(() => {
                alert('🎉 오늘의 모든 업무를 완료했습니다! 수고하셨습니다!');
            }, 500);
        }
    }

    // 업무 완료 상태 토글
    async toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            
            try {
                await this.saveData();
                this.updateTaskDisplay();
                
                // 완료 시 시각적 피드백
                if (task.completed) {
                    // 체크박스에 성공 효과 추가
                    const checkbox = document.querySelector(`input[onchange*="${id}"]`);
                    if (checkbox) {
                        checkbox.style.transform = 'scale(1.3)';
                        setTimeout(() => {
                            checkbox.style.transform = 'scale(1.2)';
                        }, 200);
                    }
                }
            } catch (error) {
                console.error('업무 상태 업데이트 오류:', error);
                // 오류 시 원래 상태로 복원
                task.completed = !task.completed;
                this.updateTaskDisplay();
            }
        }
    }

    // 업무 삭제
    deleteTask(id) {
        if (!this.isAdminMode) return;
        
        if (confirm('정말로 이 업무를 삭제하시겠습니까?')) {
            this.tasks = this.tasks.filter(task => task.id !== id);
            this.saveData();
            this.updateTaskDisplay();
        }
    }

    // 데이터 새로고침
    async refreshData() {
        if (this.supabase) {
            try {
                console.log('데이터 새로고침 중...');
                await this.loadFromSupabase();
                this.updateAttendanceDisplay();
                this.updateInventoryDisplay();
                this.updateTransactionHistory();
                this.updatePackingHistory();
                this.updateTaskDisplay();
                this.updateProductSelectors();
            } catch (error) {
                console.error('데이터 새로고침 실패:', error);
            }
        }
    }
}

// CSS 추가 (상태 배지)
const additionalStyles = `
    .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .status-packed {
        background-color: #f39c12;
        color: white;
    }
    
    .status-shipped {
        background-color: #27ae60;
        color: white;
    }
`;

// 스타일 추가
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// 앱 초기화
let logisticsManager;
document.addEventListener('DOMContentLoaded', () => {
    logisticsManager = new LogisticsManager();
});
