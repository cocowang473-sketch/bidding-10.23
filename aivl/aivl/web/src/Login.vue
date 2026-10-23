<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="login-brand">
        <div class="logo-mark">AI</div>
        <h1>AI 投标报价系统</h1>
        <p>请登录后继续分阶段处理招标文件</p>
      </div>
      <a-form :model="form" layout="vertical" class="login-form" @finish="onSubmit">
        <a-form-item
          label="用户名"
          name="username"
          :rules="[{ required: true, message: '请输入用户名' }]"
        >
          <a-input
            v-model:value="form.username"
            size="large"
            placeholder="用户名"
            autocomplete="username"
            allow-clear
          />
        </a-form-item>
        <a-form-item
          label="密码"
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <a-input-password
            v-model:value="form.password"
            size="large"
            placeholder="密码"
            autocomplete="current-password"
          />
        </a-form-item>
        <a-button type="primary" html-type="submit" size="large" block :loading="loading">
          登录
        </a-button>
      </a-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { api, setToken } from './api'

const emit = defineEmits(['success'])

const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
})

async function onSubmit() {
  loading.value = true
  try {
    const { data } = await api.login(form.username, form.password)
    setToken(data.token)
    message.success(`欢迎，${data.user?.display_name || data.user?.username || ''}`)
    emit('success', data.user)
  } catch (e) {
    message.error(e?.response?.data?.detail || e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(ellipse 80% 60% at 20% 20%, rgba(24, 144, 255, 0.18), transparent 55%),
    radial-gradient(ellipse 70% 50% at 85% 75%, rgba(0, 21, 41, 0.35), transparent 50%),
    linear-gradient(160deg, #0b1a2b 0%, #132f4c 45%, #1a3a5c 100%);
}
.login-panel {
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  padding: 40px 36px 36px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
}
.login-brand {
  text-align: center;
  margin-bottom: 28px;
}
.logo-mark {
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  color: #fff;
  background: linear-gradient(145deg, #1677ff, #003a8c);
  letter-spacing: 0.5px;
}
.login-brand h1 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 650;
  color: #0b1a2b;
}
.login-brand p {
  margin: 0;
  color: #8c8c8c;
  font-size: 13px;
}
.login-form :deep(.ant-form-item-label > label) {
  color: #595959;
}
</style>
