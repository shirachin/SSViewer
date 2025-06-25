class ImageViewer {
    constructor() {
        this.images = [];
        this.imageCounter = 0;
        this.init();
    }

    init() {
        this.pasteArea = document.getElementById('pasteArea');
        this.imageGallery = document.getElementById('imageGallery');
        this.clearAllBtn = document.getElementById('clearAll');
        this.downloadAllBtn = document.getElementById('downloadAll');

        this.setupEventListeners();
        this.updateEmptyState();
    }

    setupEventListeners() {
        // クリップボード貼り付けイベント
        document.addEventListener('paste', (e) => this.handlePaste(e));
        
        // ドラッグ&ドロップイベント
        this.pasteArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.pasteArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.pasteArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // ボタンイベント
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    }

    handlePaste(e) {
        e.preventDefault();
        const items = e.clipboardData.items;
        
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                this.addImage(file);
            }
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        this.pasteArea.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.pasteArea.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.pasteArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                this.addImage(file);
            }
        }
    }

    handleKeydown(e) {
        // Ctrl+V / Cmd+V で貼り付けエリアにフォーカス
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            this.pasteArea.focus();
        }
    }

    addImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                id: ++this.imageCounter,
                name: file.name || `画像_${this.imageCounter}`,
                size: this.formatFileSize(file.size),
                dataUrl: e.target.result,
                file: file
            };
            
            this.images.push(imageData);
            this.renderImage(imageData);
            this.updateEmptyState();
            this.updateControls();
        };
        reader.readAsDataURL(file);
    }

    renderImage(imageData) {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        imageItem.dataset.id = imageData.id;
        imageItem.setAttribute('draggable', 'true');
        
        // ファイル名と拡張子を分離
        const nameMatch = imageData.name.match(/^(.*?)(\.[^.]+)?$/);
        const baseName = nameMatch ? nameMatch[1] : imageData.name;
        const ext = nameMatch && nameMatch[2] ? nameMatch[2] : '';

        imageItem.innerHTML = `
            <img src="${imageData.dataUrl}" alt="${imageData.name}" />
            <div class="image-info">
                <div class="image-details">
                    <div class="image-name"><span class="image-name-text">${baseName}</span><span class="image-ext">${ext}</span></div>
                    <div class="image-size">${imageData.size}</div>
                </div>
                <div class="image-actions">
                    <div class="order-controls">
                        <button class="btn btn-secondary order-btn up-btn" onclick="imageViewer.moveImageUp(${imageData.id})" title="上に移動">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="18,15 12,9 6,15"></polyline>
                            </svg>
                        </button>
                        <button class="btn btn-secondary order-btn down-btn" onclick="imageViewer.moveImageDown(${imageData.id})" title="下に移動">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6,9 12,15 18,9"></polyline>
                            </svg>
                        </button>
                    </div>
                    <button class="btn btn-primary download-btn" onclick="imageViewer.downloadImage(${imageData.id})">
                        ダウンロード
                    </button>
                    <button class="btn btn-danger delete-btn" onclick="imageViewer.deleteImage(${imageData.id})">
                        削除
                    </button>
                </div>
            </div>
        `;
        
        this.imageGallery.appendChild(imageItem);
        
        // 画像クリックで新規タブで開く機能を追加
        const imgElement = imageItem.querySelector('img');
        imgElement.style.cursor = 'pointer';
        imgElement.addEventListener('click', () => this.openImageInNewTab(imageData.id));

        // ファイル名インライン編集機能（拡張子は編集不可）
        const nameSpan = imageItem.querySelector('.image-name-text');
        const extSpan = imageItem.querySelector('.image-ext');
        nameSpan.style.cursor = 'pointer';
        nameSpan.title = 'クリックして名前を編集';
        nameSpan.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = nameSpan.textContent;
            input.className = 'image-name-input';
            nameSpan.replaceWith(input);
            input.focus();
            input.select();

            // 保存処理
            const save = () => {
                let newBase = input.value.trim();
                if (!newBase) {
                    // 空欄は元の値に戻す
                    newBase = baseName;
                }
                const newName = newBase + ext;
                imageData.name = newName;
                input.replaceWith(nameSpan);
                nameSpan.textContent = newBase;
            };

            input.addEventListener('blur', save);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                } else if (e.key === 'Escape') {
                    input.value = baseName;
                    input.blur();
                }
            });
        });
        
        // ドラッグ＆ドロップ並べ替えイベント
        let dragOverPosition = null; // 'before' or 'after'
        imageItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', imageData.id);
            imageItem.classList.add('dragging');
        });
        imageItem.addEventListener('dragend', () => {
            imageItem.classList.remove('dragging');
            imageItem.classList.remove('drag-over-before', 'drag-over-after');
        });
        imageItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            const rect = imageItem.getBoundingClientRect();
            const offset = e.clientY - rect.top;
            if (offset < rect.height / 2) {
                dragOverPosition = 'before';
                imageItem.classList.add('drag-over-before');
                imageItem.classList.remove('drag-over-after');
            } else {
                dragOverPosition = 'after';
                imageItem.classList.add('drag-over-after');
                imageItem.classList.remove('drag-over-before');
            }
        });
        imageItem.addEventListener('dragleave', () => {
            imageItem.classList.remove('drag-over-before', 'drag-over-after');
        });
        imageItem.addEventListener('drop', (e) => {
            e.preventDefault();
            imageItem.classList.remove('drag-over-before', 'drag-over-after');
            const draggedId = Number(e.dataTransfer.getData('text/plain'));
            const targetId = imageData.id;
            if (draggedId === targetId) return;
            const draggedElem = this.imageGallery.querySelector(`[data-id="${draggedId}"]`);
            if (draggedElem) {
                if (dragOverPosition === 'before') {
                    this.imageGallery.insertBefore(draggedElem, imageItem);
                } else {
                    this.imageGallery.insertBefore(draggedElem, imageItem.nextSibling);
                }
            }
            // 配列の順序も入れ替え
            const draggedIdx = this.images.findIndex(img => img.id === draggedId);
            const targetIdx = this.images.findIndex(img => img.id === targetId);
            if (draggedIdx > -1 && targetIdx > -1) {
                const [draggedImg] = this.images.splice(draggedIdx, 1);
                let insertIdx = targetIdx;
                if (dragOverPosition === 'after') {
                    insertIdx = targetIdx + (draggedIdx < targetIdx ? 0 : 1);
                } else {
                    insertIdx = targetIdx - (draggedIdx < targetIdx ? 1 : 0);
                }
                this.images.splice(insertIdx, 0, draggedImg);
            }
        });
        
        // アニメーション効果
        setTimeout(() => {
            imageItem.style.opacity = '1';
            imageItem.style.transform = 'translateY(0)';
        }, 10);
        
        // 矢印ボタンの状態を更新
        this.updateOrderButtons();
    }

    openImageInNewTab(id) {
        const imageData = this.images.find(img => img.id === id);
        if (imageData) {
            // Data URLをBlobに変換してBlob URLを作成
            const base64Data = imageData.dataUrl.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: imageData.file.type });
            const blobUrl = URL.createObjectURL(blob);
            
            // 新規タブで開く
            const newWindow = window.open(blobUrl, '_blank');
            
            // タブが閉じられたときにBlob URLを解放
            if (newWindow) {
                newWindow.onbeforeunload = () => {
                    URL.revokeObjectURL(blobUrl);
                };
            } else {
                // ポップアップがブロックされた場合
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            }
        }
    }

    deleteImage(id) {
        const imageItem = document.querySelector(`[data-id="${id}"]`);
        if (imageItem) {
            imageItem.style.opacity = '0';
            imageItem.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                imageItem.remove();
                this.images = this.images.filter(img => img.id !== id);
                this.updateEmptyState();
                this.updateControls();
                this.updateOrderButtons();
            }, 300);
        }
    }

    downloadImage(id) {
        const imageData = this.images.find(img => img.id === id);
        if (imageData) {
            const link = document.createElement('a');
            link.href = imageData.dataUrl;
            link.download = imageData.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    clearAll() {
        if (this.images.length === 0) return;
        // カスタムモーダルを表示
        const modal = document.getElementById('clearAllModal');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');
        modal.style.display = 'flex';

        // 一度だけイベントを追加
        const cleanup = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };
        const onConfirm = () => {
            this.images = [];
            this.imageGallery.innerHTML = '';
            this.updateEmptyState();
            this.updateControls();
            this.updateOrderButtons();
            cleanup();
        };
        const onCancel = () => {
            cleanup();
        };
        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    }

    downloadAll() {
        if (this.images.length === 0) {
            alert('ダウンロードする画像がありません');
            return;
        }
        
        // 複数画像の場合はZIPファイルとしてダウンロード
        if (this.images.length === 1) {
            this.downloadImage(this.images[0].id);
        } else {
            this.downloadAsZip();
        }
    }

    async downloadAsZip() {
        try {
            // JSZipライブラリを使用してZIPファイルを作成
            if (typeof JSZip === 'undefined') {
                // JSZipが利用できない場合は個別ダウンロード
                this.images.forEach(img => this.downloadImage(img.id));
                return;
            }
            
            const zip = new JSZip();
            const nameCount = {};
            this.images.forEach(imageData => {
                // ファイル名と拡張子を分離
                const match = imageData.name.match(/^(.*?)(\.[^.]+)?$/);
                let base = match ? match[1] : imageData.name;
                let ext = match && match[2] ? match[2] : '';
                let fileName = base + ext;
                if (nameCount[fileName] === undefined) {
                    nameCount[fileName] = 0;
                } else {
                    nameCount[fileName]++;
                    fileName = `${base}(${nameCount[fileName]})${ext}`;
                }
                const base64Data = imageData.dataUrl.split(',')[1];
                zip.file(fileName, base64Data, {base64: true});
            });
            
            const content = await zip.generateAsync({type: 'blob'});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `images_${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('ZIPファイルの作成に失敗しました:', error);
            // フォールバック: 個別ダウンロード
            this.images.forEach(img => this.downloadImage(img.id));
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateEmptyState() {
        if (this.images.length === 0) {
            if (!this.imageGallery.querySelector('.empty-state')) {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = '<p>まだ画像がありません。クリップボードから画像を貼り付けてください。</p>';
                this.imageGallery.appendChild(emptyState);
            }
        } else {
            const emptyState = this.imageGallery.querySelector('.empty-state');
            if (emptyState) {
                emptyState.remove();
            }
        }
    }

    updateControls() {
        const hasImages = this.images.length > 0;
        this.clearAllBtn.disabled = !hasImages;
        this.downloadAllBtn.disabled = !hasImages;
        this.updateOrderButtons();
    }

    // 画像を上に移動
    moveImageUp(id) {
        const currentIndex = this.images.findIndex(img => img.id === id);
        if (currentIndex > 0) {
            // 配列の順序を変更
            const temp = this.images[currentIndex];
            this.images[currentIndex] = this.images[currentIndex - 1];
            this.images[currentIndex - 1] = temp;
            
            // DOMの順序を変更
            const currentElement = this.imageGallery.querySelector(`[data-id="${id}"]`);
            const previousElement = this.imageGallery.querySelector(`[data-id="${this.images[currentIndex].id}"]`);
            
            if (currentElement && previousElement) {
                this.imageGallery.insertBefore(currentElement, previousElement);
            }
            
            // 矢印ボタンの状態を更新
            this.updateOrderButtons();
        }
    }

    // 画像を下に移動
    moveImageDown(id) {
        const currentIndex = this.images.findIndex(img => img.id === id);
        if (currentIndex < this.images.length - 1) {
            // 配列の順序を変更
            const temp = this.images[currentIndex];
            this.images[currentIndex] = this.images[currentIndex + 1];
            this.images[currentIndex + 1] = temp;
            
            // DOMの順序を変更
            const currentElement = this.imageGallery.querySelector(`[data-id="${id}"]`);
            const nextElement = this.imageGallery.querySelector(`[data-id="${this.images[currentIndex].id}"]`);
            
            if (currentElement && nextElement) {
                this.imageGallery.insertBefore(currentElement, nextElement.nextSibling);
            }
            
            // 矢印ボタンの状態を更新
            this.updateOrderButtons();
        }
    }

    // 矢印ボタンの有効/無効状態を更新
    updateOrderButtons() {
        const imageItems = this.imageGallery.querySelectorAll('.image-item');
        imageItems.forEach((item, index) => {
            const upBtn = item.querySelector('.up-btn');
            const downBtn = item.querySelector('.down-btn');
            
            if (upBtn) {
                upBtn.disabled = index === 0;
                upBtn.style.opacity = index === 0 ? '0.5' : '1';
            }
            
            if (downBtn) {
                downBtn.disabled = index === imageItems.length - 1;
                downBtn.style.opacity = index === imageItems.length - 1 ? '0.5' : '1';
            }
        });
    }
}

// アプリケーションの初期化
let imageViewer;

document.addEventListener('DOMContentLoaded', () => {
    imageViewer = new ImageViewer();
    
    // 貼り付けエリアにフォーカス可能にする
    imageViewer.pasteArea.setAttribute('tabindex', '0');
    
    // 初期状態で貼り付けエリアにフォーカス
    imageViewer.pasteArea.focus();

    // 使い方ボタンのイベント
    const usageBtn = document.getElementById('usageBtn');
    if (usageBtn) {
        usageBtn.addEventListener('click', () => {
            window.open('usage.html', '_blank');
        });
    }

    // グローバル関数として公開（HTMLから呼び出すため）
    window.imageViewer = imageViewer;
});
