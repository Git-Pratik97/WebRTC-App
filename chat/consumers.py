from channels.generic.websocket import AsyncWebsocketConsumer
import json

class ChatConsumer(AsyncWebsocketConsumer):
   	#Groups = ["broadcast"]

	async def connect(self):
		self.room_group_name = 'Test-Room'
		
    	#To add a asynchronous group to the channel
    	#Usign group_add method
		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)
		
        # Called on connection.
        # To accept the connection call:
		await self.accept()
        # Or accept the connection and specify a chosen subprotocol.
        # A list of subprotocols specified by the connecting client
        # will be available in self.scope['subprotocols']
        
        # To reject the connection, call:
       
	async def receive(self, text_data):
    	# Called with either text_data or bytes_data for each frame
		receive_dict = json.loads(text_data)
		message = receive_dict['message']
		action = receive_dict['action']
		
		if (action == 'new-offer') or (action == 'new-answer'):
			receiver_channel_name = receive_dict['message']['receiver_channel_name']
			
			receive_dict['message']['receiver_channel_name'] = self.channel_name
			
			await self.channel_layer.send(
				receiver_channel_name,
        		{
        			'type': 'send.sdp', #To send the message in the group
        			'receive_dict': receive_dict
        		}
        	)
			
			return
		
		receive_dict['message']['receiver_channel_name'] = self.channel_name
    	
    	#Sends/broadcast the message in the group 
		await self.channel_layer.group_send(
			self.room_group_name,
        	{
        		'type': 'send.sdp', #To send the message in the group
        		'receive_dict': receive_dict
        	}
        )

	async def send_sdp(self, event):
		receive_dict = event['receive_dict']
	
		await self.send(text_data=json.dumps(receive_dict))
		
	async def disconnect(self, close_code):
	
        # Called when the socket closes
		await self.channel_layer.group_discard(
        	self.room_group_name,
    		self.channel_name
        )
		print("Disconnected !")
