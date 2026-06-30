<template>
  <router-view />
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #F9FBF8;
  color: #2d3748;
  font-size: 14px;
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
  padding: 20px;
}

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 8px 16px; border-radius: 8px; border: none;
  cursor: pointer; font-size: 14px; font-weight: 500; transition: .2s;
}
.btn-primary { background: #6CA847; color: #fff; }
.btn-primary:hover { background: #5A8D3D; }
.btn-secondary { background: #F3F8F0; color: #5A8D3D; }
.btn-secondary:hover { background: #E2EDDE; }
.btn-danger { background: #ffebee; color: #c62828; }
.btn-danger:hover { background: #ffcdd2; }
.btn-success { background: #F3F8F0; color: #5A8D3D; }
.btn-success:hover { background: #E2EDDE; }
.btn-sm { padding: 4px 10px; font-size: 12px; }

.form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.form-row label { font-size: 13px; color: #718096; font-weight: 500; }
.form-row input, .form-row select, .form-row textarea {
  padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
  font-size: 14px; outline: none; transition: .2s; background: #fff;
  font-family: inherit;
}
.form-row input:focus, .form-row select:focus, .form-row textarea:focus { border-color: #6CA847; }
.form-row textarea { resize: vertical; min-height: 70px; }

.tag {
  display: inline-block; padding: 2px 8px; border-radius: 20px;
  font-size: 12px; font-weight: 500;
}
.tag-green  { background: #F3F8F0; color: #5A8D3D; }
.tag-red    { background: #ffebee; color: #c62828; }
.tag-orange { background: #fff3e0; color: #e65100; }
.tag-blue   { background: #ebf8ff; color: #2b6cb0; }
.tag-purple { background: #f3e5f5; color: #6a1b9a; }
.tag-gray   { background: #f5f5f5; color: #616161; }

.page-header { margin-bottom: 20px; }
.page-header h2 { font-size: 20px; font-weight: 700; color: #2d3748; }
.page-header p  { color: #718096; margin-top: 4px; font-size: 13px; }

.empty { text-align: center; color: #a0aec0; padding: 40px 20px; font-size: 14px; }

input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 3px; }
</style>
