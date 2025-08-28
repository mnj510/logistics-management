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
        
        this.initSupabase();
        this.init();
        this.setupEventListeners();
        this.initializeTimeSelector();
        this.initializeDateFilters();
        
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
    }

    async loadFromSupabase() {
        try {
            const [attendance, inventory, transactions, packing, tasks] = await Promise.all([
                this.supabase.from('attendance_records').select('*'),
                this.supabase.from('inventory').select('*'),
                this.supabase.from('transactions').select('*'),
                this.supabase.from('packing_records').select('*'),
                this.supabase.from('tasks').select('*')
            ]);

            this.attendanceRecords = attendance.data || [];
            this.inventory = inventory.data || [];
            this.transactions = transactions.data || [];
            this.packingRecords = packing.data || [];
            this.tasks = tasks.data || [];
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
            await Promise.all([
                this.syncTableData('attendance_records', this.attendanceRecords),
                this.syncTableData('inventory', this.inventory),
                this.syncTableData('transactions', this.transactions),
                this.syncTableData('packing_records', this.packingRecords),
                this.syncTableData('tasks', this.tasks)
            ]);
            
            // 로컬 스토리지에도 백업 저장
            this.saveToLocalStorage();
        } catch (error) {
            console.error('Supabase에 데이터 저장 실패:', error);
            this.saveToLocalStorage(); // fallback to localStorage
        }
    }

    async syncTableData(tableName, data) {
        if (!data || data.length === 0) return;
        
        const { error } = await this.supabase
            .from(tableName)
            .upsert(data, { onConflict: 'id' });
            
        if (error) {
            console.error(`${tableName} 동기화 실패:`, error);
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

        // 재고 관리
        document.getElementById('addProductBtn').addEventListener('click', () => this.showProductModal());
        document.getElementById('searchBtn').addEventListener('click', () => this.searchInventory());
        document.getElementById('inventorySearch').addEventListener('input', () => this.searchInventory());
        document.getElementById('saveProductBtn').addEventListener('click', () => this.saveProduct());
        document.getElementById('cancelProductBtn').addEventListener('click', () => this.hideProductModal());

        // 입출고
        document.getElementById('barcodeInput').addEventListener('input', (e) => this.handleBarcodeInput(e.target.value));
        document.getElementById('processTransactionBtn').addEventListener('click', () => this.processTransaction());

        // 포장
        document.getElementById('packingBarcode').addEventListener('input', (e) => this.handlePackingBarcodeInput(e.target.value));
        document.getElementById('packBtn').addEventListener('click', () => this.processPacking());
        document.getElementById('shipBtn').addEventListener('click', () => this.processShipping());

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

    // 시간 선택기 초기화 (10분 단위)
    initializeTimeSelector() {
        const timeSelector = document.getElementById('attendanceTime');
        timeSelector.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 10) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = timeStr;
                option.textContent = timeStr;
                timeSelector.appendChild(option);
            }
        }
        
        // 현재 시간으로 설정 (10분 단위로 반올림)
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = Math.round(now.getMinutes() / 10) * 10;
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${(currentMinute % 60).toString().padStart(2, '0')}`;
        timeSelector.value = currentTime;
    }

    // 날짜 필터 초기화
    initializeDateFilters() {
        const yearFilter = document.getElementById('yearFilter');
        const monthFilter = document.getElementById('monthFilter');
        const dayFilter = document.getElementById('dayFilter');
        
        // 년도 필터 (현재 년도 기준 ±2년)
        const currentYear = new Date().getFullYear();
        yearFilter.innerHTML = '<option value="">전체</option>';
        for (let year = currentYear - 2; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            yearFilter.appendChild(option);
        }
        yearFilter.value = currentYear;

        // 월 필터
        monthFilter.innerHTML = '<option value="">전체</option>';
        for (let month = 1; month <= 12; month++) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = `${month}월`;
            monthFilter.appendChild(option);
        }
        monthFilter.value = new Date().getMonth() + 1;

        // 일 필터
        this.updateDayFilter();
        
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
    checkIn() {
        const selectedTime = document.getElementById('attendanceTime').value;
        const today = new Date().toISOString().split('T')[0];
        
        // 오늘 이미 출근했는지 확인
        const existingRecord = this.attendanceRecords.find(record => 
            record.date === today && record.checkIn
        );
        
        if (existingRecord && !existingRecord.checkOut) {
            alert('이미 출근 처리되었습니다.');
            return;
        }
        
        if (existingRecord && existingRecord.checkOut) {
            // 이미 퇴근한 경우 새로운 출근 기록 생성
            const newRecord = {
                id: Date.now(),
                date: today,
                checkIn: selectedTime,
                checkOut: null,
                workHours: 0
            };
            this.attendanceRecords.push(newRecord);
        } else {
            // 새로운 출근 기록
            const newRecord = {
                id: Date.now(),
                date: today,
                checkIn: selectedTime,
                checkOut: null,
                workHours: 0
            };
            this.attendanceRecords.push(newRecord);
        }
        
        this.saveData();
        this.updateAttendanceDisplay();
        alert(`${selectedTime}에 출근 처리되었습니다.`);
    }

    // 퇴근 처리
    checkOut() {
        const selectedTime = document.getElementById('attendanceTime').value;
        const today = new Date().toISOString().split('T')[0];
        
        // 오늘 출근했지만 퇴근하지 않은 기록 찾기
        const record = this.attendanceRecords.find(record => 
            record.date === today && record.checkIn && !record.checkOut
        );
        
        if (!record) {
            alert('출근 기록이 없습니다.');
            return;
        }
        
        record.checkOut = selectedTime;
        record.workHours = this.calculateWorkHours(record.checkIn, record.checkOut);
        
        this.saveData();
        this.updateAttendanceDisplay();
        alert(`${selectedTime}에 퇴근 처리되었습니다.`);
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

    // 출퇴근 기록 필터링
    filterAttendance() {
        this.updateAttendanceDisplay();
    }

    // 출퇴근 기록 표시 업데이트
    updateAttendanceDisplay() {
        const tbody = document.querySelector('#attendanceTable tbody');
        if (!tbody) return;
        
        const yearFilter = document.getElementById('yearFilter');
        const monthFilter = document.getElementById('monthFilter');
        const dayFilter = document.getElementById('dayFilter');
        
        if (!yearFilter || !monthFilter || !dayFilter) return;
        
        // 데이터가 아직 로드되지 않았으면 빈 배열로 초기화
        if (!this.attendanceRecords) {
            this.attendanceRecords = [];
        }
        
        let filteredRecords = this.attendanceRecords;
        
        // 필터 적용
        if (yearFilter || monthFilter || dayFilter) {
            filteredRecords = this.attendanceRecords.filter(record => {
                const recordDate = new Date(record.date);
                const recordYear = recordDate.getFullYear();
                const recordMonth = recordDate.getMonth() + 1;
                const recordDay = recordDate.getDate();
                
                if (yearFilter && recordYear !== parseInt(yearFilter)) return false;
                if (monthFilter && recordMonth !== parseInt(monthFilter)) return false;
                if (dayFilter && recordDay !== parseInt(dayFilter)) return false;
                
                return true;
            });
        }
        
        // 최신 순으로 정렬
        filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        tbody.innerHTML = '';
        filteredRecords.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.date}</td>
                <td>${record.checkIn || '-'}</td>
                <td>${record.checkOut || '-'}</td>
                <td>${record.workHours ? this.formatMinutes(record.workHours) : '-'}</td>
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
        const completedRecords = records.filter(record => record.checkOut);
        const totalMinutes = completedRecords.reduce((sum, record) => sum + record.workHours, 0);
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
            document.getElementById('productUnit').value = product.unit;
        } else {
            title.textContent = '상품 추가';
            document.getElementById('productBarcode').value = '';
            document.getElementById('productName').value = '';
            document.getElementById('productQuantity').value = '0';
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
            product.unit = unit;
        } else {
            // 새 상품 추가
            const newProduct = {
                id: Date.now(),
                barcode,
                name,
                quantity,
                unit
            };
            this.inventory.push(newProduct);
        }
        
        this.saveData();
        this.updateInventoryDisplay();
        this.updateProductSelectors();
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
                <td>${product.unit}</td>
                <td>
                    <button class="btn btn-info" onclick="logisticsManager.showProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="logisticsManager.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
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
    }

    // 상품 선택기 업데이트
    updateProductSelectors() {
        const selectors = ['productSelect', 'packingProduct'];
        
        // 데이터가 아직 로드되지 않았으면 빈 배열로 초기화
        if (!this.inventory) {
            this.inventory = [];
        }
        
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (!selector) return;
            
            selector.innerHTML = '<option value="">상품을 선택하세요</option>';
            
            this.inventory.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (${product.barcode})`;
                selector.appendChild(option);
            });
        });
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
            type: type === 'in' ? '입고' : '출고',
            quantity,
            timestamp: new Date().toLocaleString('ko-KR')
        };
        
        this.transactions.push(transaction);
        this.saveData();
        this.updateInventoryDisplay();
        this.updateTransactionHistory();
        
        // 폼 초기화
        document.getElementById('barcodeInput').value = '';
        document.getElementById('productSelect').value = '';
        document.getElementById('quantityInput').value = '1';
        
        alert(`${transaction.type} 처리가 완료되었습니다.`);
    }

    // 거래 내역 업데이트
    updateTransactionHistory() {
        const tbody = document.querySelector('#transactionTable tbody');
        if (!tbody) return;
        
        // 데이터가 아직 로드되지 않았으면 빈 배열로 초기화
        if (!this.transactions) {
            this.transactions = [];
        }
        
        const recentTransactions = this.transactions.slice(-20).reverse(); // 최근 20개
        
        tbody.innerHTML = '';
        recentTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.timestamp}</td>
                <td>${transaction.productName}</td>
                <td>${transaction.type}</td>
                <td>${transaction.quantity}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // 포장 바코드 입력 처리
    handlePackingBarcodeInput(barcode) {
        if (barcode.length > 3) {
            const product = this.inventory.find(p => p.barcode === barcode);
            if (product) {
                document.getElementById('packingProduct').value = product.id;
            }
        }
    }

    // 포장 처리
    processPacking() {
        const productId = document.getElementById('packingProduct').value;
        const quantity = parseInt(document.getElementById('packingQuantity').value) || 0;
        
        if (!productId || quantity <= 0) {
            alert('상품과 수량을 올바르게 입력해주세요.');
            return;
        }
        
        const product = this.inventory.find(p => p.id === parseInt(productId));
        if (!product) {
            alert('상품을 찾을 수 없습니다.');
            return;
        }
        
        // 포장 기록 추가
        const packingRecord = {
            id: Date.now(),
            productId: product.id,
            productName: product.name,
            quantity,
            status: '포장완료',
            timestamp: new Date().toLocaleString('ko-KR')
        };
        
        this.packingRecords.push(packingRecord);
        this.saveData();
        this.updatePackingHistory();
        
        // 폼 초기화
        document.getElementById('packingBarcode').value = '';
        document.getElementById('packingProduct').value = '';
        document.getElementById('packingQuantity').value = '1';
        
        alert('포장 처리가 완료되었습니다.');
    }

    // 출고 처리
    processShipping() {
        const packingRecords = this.packingRecords.filter(record => record.status === '포장완료');
        
        if (packingRecords.length === 0) {
            alert('출고할 포장 상품이 없습니다.');
            return;
        }
        
        // 포장완료 상품들을 출고완료로 변경하고 재고에서 차감
        packingRecords.forEach(record => {
            record.status = '출고완료';
            record.shippedAt = new Date().toLocaleString('ko-KR');
            
            // 재고 차감
            const product = this.inventory.find(p => p.id === record.productId);
            if (product && product.quantity >= record.quantity) {
                product.quantity -= record.quantity;
            }
        });
        
        this.saveData();
        this.updateInventoryDisplay();
        this.updatePackingHistory();
        
        alert(`${packingRecords.length}개 상품이 출고 처리되었습니다.`);
    }

    // 포장 내역 업데이트
    updatePackingHistory() {
        const tbody = document.querySelector('#packingTable tbody');
        if (!tbody) return;
        
        // 데이터가 아직 로드되지 않았으면 빈 배열로 초기화
        if (!this.packingRecords) {
            this.packingRecords = [];
        }
        
        const recentRecords = this.packingRecords.slice(-20).reverse(); // 최근 20개
        
        tbody.innerHTML = '';
        recentRecords.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.timestamp}</td>
                <td>${record.productName}</td>
                <td>
                    <span class="status-badge ${record.status === '포장완료' ? 'status-packed' : 'status-shipped'}">
                        ${record.status}
                    </span>
                </td>
                <td>${record.quantity}</td>
                <td>
                    ${record.status === '포장완료' ? 
                        `<button class="btn btn-warning" onclick="logisticsManager.shipSingleItem(${record.id})">
                            <i class="fas fa-shipping-fast"></i> 출고
                        </button>` : 
                        '-'
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // 단일 상품 출고
    shipSingleItem(recordId) {
        const record = this.packingRecords.find(r => r.id === recordId);
        if (!record) return;
        
        record.status = '출고완료';
        record.shippedAt = new Date().toLocaleString('ko-KR');
        
        // 재고 차감
        const product = this.inventory.find(p => p.id === record.productId);
        if (product && product.quantity >= record.quantity) {
            product.quantity -= record.quantity;
        }
        
        this.saveData();
        this.updateInventoryDisplay();
        this.updatePackingHistory();
        
        alert('출고 처리가 완료되었습니다.');
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
            taskItem.className = 'task-item';
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
    }

    // 업무 완료 상태 토글
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveData();
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
