<template lang="pug">
div.container
  h2 即時通知系統

  .form-group
    label User name:
    input(v-model="userName" placeholder="請輸入使用者名稱" @blur="joinGroup")

  .form-group
    label Select a group:
    select(v-model="selectedGroup" @change="joinGroup")
      option(value="lunch") 午餐吃什麼研究所
      option(value="night") 夜貓子讀書會
      option(value="alarm") 鬧鐘互助會
  .form-group
    label 發送私人消息給:
    input(v-model="sendPrivateMessageTarget" placeholder="請輸入使用者名稱")

  .form-group
    label Message:
    input(v-model="messageInput" placeholder="請輸入訊息")

  button.btn(v-for="btn in buttons" :key="btn.type" @click="sendMessage(btn.type)" :style="{ background: btn.color }") {{ btn.label }}

  ul.messages
    li.message(v-for="msg in messages" :key="msg.id")
      strong {{ msg.sender }} @ {{ msg.group }}: {{ msg.content }}

  transition(name="fade")
    div.toast(v-if="toastMessage") {{ toastMessage }}
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue'
import * as signalR from '@microsoft/signalr'

export default defineComponent({
  setup () {
    const userName = ref('User_' + Math.floor(Math.random() * 1000))
    const selectedGroup = ref('lunch')
    const messageInput = ref('')
    const sendPrivateMessageTarget = ref('')
    const messages = ref<{ id: number; sender: string; group: string; content: string }[]>([])
    const toastMessage = ref<string | null>(null)
    const isConnected = ref(false)
    const connection = ref<signalR.HubConnection | null>(null)

    const buttons = ref([
      { type: 'private', label: 'Send to private', color: '#8F4586' },
      { type: 'group', label: 'Send to group', color: '#005AB5' },
      { type: 'broadcast', label: 'Send to all', color: '#707038' }
    ])

    // 初始化 SignalR 連線
    onMounted(async () => {
      connection.value = new signalR.HubConnectionBuilder()
        .withUrl('http://localhost:5023/notificationHub')
        .withAutomaticReconnect()
        .build()

      // 重連
      connection.value.onreconnecting((error) => {
        console.log('SignalR 正在重連...', error)
      })

      // 重連成功
      connection.value.onreconnected((connectionId) => {
        console.log('SignalR 重連成功，連線ID:', connectionId)
      })

      // 失敗回調
      connection.value.onclose(async (err) => {
        console.log('SignalR 斷線:', err)
        isConnected.value = false
      })

      // 接收私人訊息
      connection.value?.on('ReceivePrivateMessage', (sender: string, message: string) => {
        messages.value.push({ id: messages.value.length + 1, sender, group: 'Private', content: message })
        console.log(message)
        showToast(`Private: ${message}`)
      })

      // 接收群組訊息
      connection.value.on('ReceiveGroupMessage', (sender: string, group: string, message: string) => {
        messages.value.push({ id: messages.value.length + 1, sender, group, content: message })
        showToast(`${sender} @ ${group}: ${message}`)
      })

      // 接收廣播訊息
      connection.value.on('ReceiveMessage', (message: string) => {
        messages.value.push({ id: messages.value.length + 1, sender: 'System', group: 'Broadcast', content: message })
        showToast(`System: ${message}`) // 顯示廣播訊息
      })

      try {
        // 等待連線成功
        await connection.value.start()
        isConnected.value = true
        joinGroup()
        console.log('SignalR 連線成功！')
      } catch (err) {
        console.error('SignalR 連線失敗:', err)
        isConnected.value = false
      }
    })

    watch(selectedGroup, (newGroup, oldGroup) => {
      if (newGroup !== oldGroup) {
        // 當群組改變時，先退出舊群組
        leaveGroup(oldGroup)
      }
    })

    function leaveGroup (oldGroup: string) {
      if (connection.value?.state === signalR.HubConnectionState.Connected) {
        connection.value?.invoke('LeaveGroup', oldGroup) // 離開舊群組
          .catch(err => console.error('離開舊群組失敗:', err))
      }
    }

    // 連線成功後加入群組
    function joinGroup () {
      if (connection.value?.state === signalR.HubConnectionState.Connected) {
        connection.value.invoke('JoinGroup', selectedGroup.value)
          .catch(err => console.error('加入群組失敗:', err))
      }
    }

    // 發送訊息
    function sendMessage (type: string) {
      if (!userName.value) return alert('請輸入使用者名稱')
      if (!messageInput.value.trim()) return alert('請輸入訊息')
      if (!isConnected.value) {
        alert('尚未連線，請稍候...')
        return
      }

      // 根據選擇的群組或廣播來發送訊息
      const msg = messageInput.value
      const user = userName.value

      switch (type) {
        case 'private':
          connection.value?.invoke('SendToPrivate', sendPrivateMessageTarget.value, user, msg)
            .catch(err => console.error('發送私人訊息錯誤:', err))
          sendPrivateMessageTarget.value = ''
          break

        case 'group':
          connection.value?.invoke('SendToGroup', selectedGroup.value, user, msg)
            .catch(err => console.error('發送訊息錯誤:', err))
          break

        default:
          connection.value?.invoke('Broadcast', msg)
            .catch(err => console.error('發送廣播訊息錯誤:', err))
      }

      // 清空輸入框
      messageInput.value = ''
    }

    // 顯示訊息
    function showToast (message: string) {
      toastMessage.value = message
      setTimeout(() => {
        toastMessage.value = null
      }, 3000)
    }

    return { userName, selectedGroup, messageInput, sendPrivateMessageTarget, messages, toastMessage, sendMessage, joinGroup, isConnected, buttons }
  }
})

</script>

<style lang="stylus" scoped>
.container
  padding 20px
  h2
    font-size 24px
  .form-group
    margin-bottom 10px
    label
      display block
      margin-bottom 5px
    input, select
      padding 8px
      width 200px
      border 1px solid #ccc
      border-radius 5px
  .btn
    color white
    padding 10px 20px
    border none
    border-radius 8px
    cursor pointer
    margin 0 10px
    &:hover
      opacity .9
  .messages
    margin-top 20px
    list-style none
    padding 0
    .message
      padding 10px
      background #f1f1f1
      margin-bottom 5px
      border-radius 5px
  .toast
    position fixed
    bottom 20px
    right 20px
    background #323232
    color white
    padding 15px 20px
    border-radius 8px
    box-shadow 0 2px 10px rgba(0,0,0,0.3)
.fade-enter-active, .fade-leave-active
  transition opacity 0.5s
.fade-enter-from, .fade-leave-to
  opacity 0
</style>
