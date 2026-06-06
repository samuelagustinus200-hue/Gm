const STORAGE_KEY = "premium_greetings_data";

function getAllGreetings() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function updateGreetingsList(updatedArray) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedArray));
    renderDashboard();
}

function renderDashboard() {
    const greetings = getAllGreetings();
    const tbody = document.getElementById('admin-table-body');
    
    // Hitung akumulasi statistik performa
    let totalViews = 0;
    greetings.forEach(g => totalViews += (g.views || 0));
    
    document.getElementById('stat-total-links').innerText = greetings.length;
    document.getElementById('stat-total-views').innerText = totalViews;

    // Bersihkan tabel sebelum me-render ulang
    tbody.innerHTML = "";

    if (greetings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #9ca3af; padding: 40px;">Belum ada data ucapan yang dibuat.</td></tr>`;
        return;
    }

    // Urutkan berdasarkan data terbaru yang dibuat
    greetings.reverse().forEach(item => {
        const tr = document.createElement('tr');
        
        const currentDomain = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        const targetUrl = `${currentDomain}?id=${item.id}&token=${item.token}`;

        tr.innerHTML = `
            <td>${item.timestamp || 'N/A'}</td>
            <td><strong>${escapeHtml(item.sender)}</strong></td>
            <td><strong>${escapeHtml(item.recipient)}</strong></td>
            <td>${escapeHtml(item.title)}</td>
            <td><span class="badge">${item.views || 0} x dibuka</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-sm btn-copy-table" onclick="copyLinkDirect('${targetUrl}', this)">Salin Link</button>
                    <button class="btn-sm btn-edit" onclick="openEditModal('${item.id}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="deleteItem('${item.id}')">Hapus</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function copyLinkDirect(url, element) {
    navigator.clipboard.writeText(url);
    const originalText = element.innerText;
    element.innerText = "Tersalin!";
    element.style.background = "#047857";
    setTimeout(() => {
        element.innerText = originalText;
        element.style.background = "#10b981";
    }, 1500);
}

function deleteItem(id) {
    if (confirm("Apakah Anda yakin ingin menghapus permanen data ucapan premium ini beserta statistik view-nya?")) {
        const greetings = getAllGreetings();
        const filtered = greetings.filter(g => g.id !== id);
        updateGreetingsList(filtered);
    }
}

// EDIT ENGINE LOGIC PIPELINES
const drawer = document.getElementById('edit-drawer');
const editForm = document.getElementById('edit-greeting-form');

function openEditModal(id) {
    const greetings = getAllGreetings();
    const item = greetings.find(g => g.id === id);
    
    if (!item) return;

    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-sender-name').value = item.sender;
    document.getElementById('edit-recipient-name').value = item.recipient;
    document.getElementById('edit-greeting-title').value = item.title;
    document.getElementById('edit-greeting-message').value = item.message;
    document.getElementById('edit-photo-url').value = item.photo;
    document.getElementById('edit-music-url').value = item.music;

    drawer.classList.remove('hidden');
}

document.getElementById('btn-close-drawer').addEventListener('click', () => {
    drawer.classList.add('hidden');
});

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const greetings = getAllGreetings();
    const index = greetings.findIndex(g => g.id === id);

    if (index !== -1) {
        greetings[index].sender = document.getElementById('edit-sender-name').value;
        greetings[index].recipient = document.getElementById('edit-recipient-name').value;
        greetings[index].title = document.getElementById('edit-greeting-title').value;
        greetings[index].message = document.getElementById('edit-greeting-message').value;
        greetings[index].photo = document.getElementById('edit-photo-url').value;
        greetings[index].music = document.getElementById('edit-music-url').value;

        // Token tidak diubah untuk menjaga validitas link yang sudah dibagikan sebelumnya
        updateGreetingsList(greetings);
        drawer.classList.add('hidden');
    }
});

// Jalankan fungsi render saat halaman dasbor selesai dimuat
window.addEventListener('DOMContentLoaded', renderDashboard);
