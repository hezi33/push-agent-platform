

# -*- coding: utf-8 -*-
"""
Created on Mon Apr 26 15:46:01 2021

@author: zhangrui08; liansiqi; wangsuixin
"""

import pandas as pd
import datetime
import math
import numpy as np
import re
import os
import time
import sys
from itertools import compress
#from styleframe import StyleFrame, Styler
#PROJECT_PATH = os.path.dirname(os.path.abspath('__file__'))
#sys.path.append(PROJECT_PATH)
# os.chdir(r"D:\程序\push") 

#print(PROJECT_PATH)
#定义回溯到n天前
dd=-1

# 核查数据是否有更新，并给文件改名
today = (datetime.date.today()).strftime('%Y-%m-%d')
yesterday = (datetime.date.today() + datetime.timedelta(days=dd)).strftime('%Y-%m-%d')
## push平台上下载文件格式 ****(2021-04-21 00_00_00至2021-04-29 00_00_00)
push_files = ["全量push","个性化Push","本地push","省份维度完成情况","本地编辑工作完成情况"] 
timemark = '('+ yesterday + ' 00_00_00至' + today + ' 00_00_00)'
unupdate_pushfiles = []
incorrectdate_pushfiles = []
multi_files = []
miss_files = []
files_and_dirs = os.listdir()
for file in push_files:
    file_re_match =  list(filter(lambda x : file in x , files_and_dirs))
    if len(file_re_match) > 1:
        multi_files = multi_files + file_re_match
        continue
    if len(file_re_match) == 0:
        miss_files.append(file)
        continue
    if (file != "省份维度完成情况"):
        real_filename = file + timemark + '.xlsx'
    else:
        real_filename = "省份维度完成情况(" + yesterday +').xlsx'
    # 如果文件未找到，则说明下载时间错误
    try:
        renew_date = datetime.datetime.strptime(time.ctime(os.path.getmtime(real_filename)), '%a %b %d %H:%M:%S %Y').strftime('%Y-%m-%d')
    except FileNotFoundError:
        incorrectdate_pushfiles.append(real_filename)
        continue
    if (renew_date != today):
        unupdate_pushfiles.append(real_filename)

## 数易及KPI日报主要核查是否更新，及是否包含本日期
#shuyi_files = ["push关键指标波动分析","各平台推送概况","各推送类型推送概况","精编、非精编数据","PUSH-KPI报表-日报"]
shuyi_files = ["push关键指标波动分析","各平台推送概况","各推送类型推送概况","PUSH-KPI报表-日报"]
incorrectdate_shuyifiles = []
unupdate_shuyifiles = []
for file in shuyi_files:
    real_filename = list(filter(lambda x : file in x , files_and_dirs))
    if len(real_filename) > 1:
        multi_files = multi_files + real_filename
        continue
    elif len(real_filename) == 0:
        miss_files.append(file)
        continue
    else:
        try:
            renew_date = datetime.datetime.strptime(time.ctime(os.path.getmtime(real_filename[0])), '%a %b %d %H:%M:%S %Y').strftime('%Y-%m-%d')
        except TypeError:
            multi_files = multi_files + real_filename
            continue
    if (renew_date != today):
        unupdate_shuyifiles.append(real_filename[0])
        continue
    if file != 'PUSH-KPI报表-日报':
        if (yesterday not in real_filename[0]):
            unupdate_shuyifiles.append(real_filename[0])
            continue
    else:
        today_temp = (datetime.date.today()).strftime('%Y%m%d')
        if (today_temp not in real_filename[0]):
            incorrectdate_shuyifiles.append(real_filename[0])
            continue
## 返回结果
## 一般只有精编非精编未更新才是可接受的
incorrectdate_list = incorrectdate_pushfiles + incorrectdate_shuyifiles
unupdate_list = unupdate_pushfiles + unupdate_shuyifiles
if (len(incorrectdate_list)!= 0) or (len(multi_files) != 0) or (len(miss_files) != 0) or (len(unupdate_list) != 0):
    if (len(incorrectdate_list)!= 0):
        print('\n以下文件日期不匹配，请仔细检查：\n'+'\n'.join(incorrectdate_list))
        time.sleep(1)
    if (len(unupdate_list)!= 0):
        print('\n以下文件未更新，请仔细检查：\n'+'\n'.join(unupdate_list))
        time.sleep(1)
    if len(multi_files) != 0:
        print('\n以下文件存在多个同名文件导致无法检查，请仔细检查并删除多余文件：\n'+'\n'.join(multi_files))
    if len(miss_files) != 0:
        print('\n以下文件缺失，请仔细检查：\n'+'\n'.join(miss_files))
        print('\n检测到文件缺失，代码自动停止运行')
        sys.exit()
    continue_flag = input('是否停止运行程序？\n（输入1：退出程序）')
    if continue_flag == '1':
        sys.exit()
    else:
        print('\n接受指令，继续执行\n')
else:
    print('\n文件通过检查，继续运行程序\n')

## 对文件名进行统一的改名
target_filenames = push_files + shuyi_files
for file in target_filenames:
    target_filename = file + '.xlsx'
    original_filename = list(filter(lambda x : file in x , files_and_dirs))[0]
    os.rename(original_filename, target_filename)
    print('文件【'+original_filename+'】已改名为【'+target_filename+'】')

#renew_file_name = ['push关键指标波动分析.xlsx','各推送类型推送概况.xlsx','PUSH-KPI报表-日报.xlsx','各平台推送概况.xlsx','目标首启参考值.xlsx','精编、非精编数据.xlsx']
renew_file_name = ['push关键指标波动分析.xlsx','各推送类型推送概况.xlsx','PUSH-KPI报表-日报.xlsx','各平台推送概况.xlsx','目标首启参考值.xlsx']
data_1 = pd.read_excel("push关键指标波动分析.xlsx",sheet_name = '表格')
data_2 = pd.read_excel("各推送类型推送概况.xlsx",sheet_name = '表格')
data_3 = pd.read_excel("PUSH-KPI报表-日报.xlsx",sheet_name = '11-概况-独立打开uv堆积面积图无系统维度')
data_4 = pd.read_excel("各平台推送概况.xlsx",sheet_name = 'push推送数据-平台')
data_5 = pd.read_excel("PUSH-KPI报表-日报.xlsx",sheet_name = '14-概况-分发送类型PUSH首启uv')
# data_6 = pd.read_excel("PUSH-KPI报表-日报.xlsx",sheet_name = '13-概况-PUSH启动数据')
data_mb = pd.read_excel("目标首启参考值.xlsx")
province_new_aim = pd.read_excel("各省份22.12打开openuv均值.xlsx",sheet_name = "结果")
#all
## 首启用户数从data_5数据透视表中出
data_1.columns = data_1.iloc[0,:]
data_1 = data_1.drop(index = 0,axis = 0)
data_1 = data_1.reset_index(drop = True)
date_now = (datetime.date.today() + datetime.timedelta(days=dd)).strftime('%Y%m%d')
date_2 = (datetime.date.today() + datetime.timedelta(days=dd)).strftime('%Y-%m-%d')
data_today = data_1[data_1['日期'] == str(date_now)]
data_today_all = data_today[data_1['平台'] == 'all']
data = pd.read_excel("PUSH表头.xlsx")
data_all = data.copy() 
data_all[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] = data_today_all[['日期','平台','展示人数','打开人数','展示次数','打开次数']] 
data_all['uv打开率'] = format(int(data_all['打开人数']) / int(data_all['展示人数']),'.2%')
data_all['pv打开率'] = format(int(data_all['打开次数']) / int(data_all['展示次数']),'.2%')
data_all['人均展示次数'] = round(int(data_all['展示次数']) / int(data_all['展示人数']),4)
# 从data5中获得数据透视表 弃用data6
sq_usernum_by_date = pd.pivot_table(data_5,index=[u'day'],columns=[u'push_send_type_group'],values=[u'first_open_uv'],aggfunc=[sum])
yesterday_str = (datetime.date.today() + datetime.timedelta(days=dd)).strftime('%Y%m%d')
sq_usernum_by_date = sq_usernum_by_date.loc[sq_usernum_by_date.index == int(yesterday_str),:]
sq_usernum_all = sum(sq_usernum_by_date.iloc[0,:])
data_all['首启用户数'] = sq_usernum_all
data_all['110万目标首启参考值'] = format(int(data_mb['all']))
data_all['首启率'] = format(int(data_all['首启用户数']) / int(data_all['展示次数']),'.2%')


print('Sheet: PUSH日报 - all表已经写入')
#全量
data_2.columns = data_2.iloc[0,:]
data_2 = data_2.drop(index = 0,axis = 0)
data_2 = data_2.reset_index(drop = True)
data_ql = data_2[data_2['日期'] == str(date_now)]
data_ql_today = data_ql[(data_ql['发送类型'] == '全量') & (data_ql['厂商'] == 'all')]
data_quanliang = data.copy()
data_quanliang[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] = data_ql_today[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] 
data_quanliang['uv打开率'] = format(int(data_quanliang['打开人数']) / int(data_quanliang['展示人数']),'.2%')
data_quanliang['pv打开率'] = format(int(data_quanliang['打开次数']) / int(data_quanliang['展示次数']),'.2%')

date_1 = (datetime.date.today() + datetime.timedelta(days=dd)).strftime('%Y-%m-%d')
uv_1 = data_3[(data_3['day1'] == str(date_1)) & (data_3['push_send_type'] == '全量')]

uv_1 = uv_1.reset_index(drop = True)
data_quanliang['独立打开uv'] = uv_1['独立打开uv'][0]
data_quanliang['人均展示次数'] = round(int(data_quanliang['展示次数']) / int(data_quanliang['展示人数']),4)
sq_quanliang = data_5[(data_5['day'] == int(date_now)) & (data_5['push_send_type_group'] =='全量')].reset_index(drop = True)
data_quanliang['首启用户数'] = sq_quanliang['first_open_uv'][0]
data_quanliang['110万目标首启参考值'] = format(int(data_mb['全量']))
data_quanliang['首启率'] = format(int(data_quanliang['首启用户数']) / int(data_quanliang['展示次数']),'.2%')
print('Sheet: PUSH日报 - 全量push表已经生成')
#个性化实时
data_gx = data_ql[(data_ql['发送类型'] == '个性化实时') & (data_ql['厂商'] == 'all')]
data_gx_today = data.copy()
data_gx_today[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] = data_gx[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] 
data_gx_today['uv打开率'] = format(int(data_gx_today['打开人数']) / int(data_gx_today['展示人数']),'.2%')
data_gx_today['pv打开率'] = format(int(data_gx_today['打开次数']) / int(data_gx_today['展示次数']),'.2%')
uv_2 = data_3[(data_3['day1'] == str(date_1)) & (data_3['push_send_type'] == '个性化实时')]

uv_2 = uv_2.reset_index(drop = True)
data_gx_today['独立打开uv'] = uv_2['独立打开uv'][0]
data_gx_today['人均展示次数'] = round(int(data_gx_today['展示次数']) / int(data_gx_today['展示人数']),4)
sq_gx = data_5[(data_5['day'] == int(date_now)) & (data_5['push_send_type_group'] == '个性化实时')].reset_index(drop = True)
data_gx_today['首启用户数'] = sq_gx['first_open_uv'][0]
data_gx_today['110万目标首启参考值'] = format(int(data_mb['个性化实时']))
data_gx_today['首启率'] = format(int(data_gx_today['首启用户数']) / int(data_gx_today['展示次数']),'.2%')
print('Sheet: PUSH日报 - 个性化实时表已经生成')
#本地实时
data_bd = data_ql[(data_ql['发送类型'] == '本地实时') & (data_ql['厂商'] == 'all')]
data_bd_today = data.copy()
data_bd_today[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] = data_bd[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] 
data_bd_today['uv打开率'] = format(int(data_bd_today['打开人数']) / int(data_bd_today['展示人数']),'.2%')
data_bd_today['pv打开率'] = format(int(data_bd_today['打开次数']) / int(data_bd_today['展示次数']),'.2%')
uv_3 = data_3[(data_3['day1'] == str(date_1)) & (data_3['push_send_type'] == '本地实时')]

uv_3 = uv_3.reset_index(drop = True)
data_bd_today['独立打开uv'] = uv_3['独立打开uv'][0]
data_bd_today['人均展示次数'] = round(int(data_bd_today['展示次数']) / int(data_bd_today['展示人数']),4)
sq_bd = data_5[(data_5['day'] == int(date_now)) & (data_5['push_send_type_group'] == '本地实时')].reset_index(drop = True)
data_bd_today['首启用户数'] = sq_bd['first_open_uv'][0]
data_bd_today['110万目标首启参考值'] = format(int(data_mb['本地实时']))
data_bd_today['首启率'] = format(int(data_bd_today['首启用户数']) / int(data_bd_today['展示次数']),'.2%')
print('Sheet: PUSH日报 - 本地实时表已经生成')
#个性化非实时
data_gxf = data_ql[(data_ql['发送类型'] == '个性化非实时') & (data_ql['厂商'] == 'all')]
data_gxf_today = data.copy()
data_gxf_today[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] = data_gxf[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] 
data_gxf_today['uv打开率'] = format(int(data_gxf_today['打开人数']) / int(data_gxf_today['展示人数']),'.2%')
data_gxf_today['pv打开率'] = format(int(data_gxf_today['打开次数']) / int(data_gxf_today['展示次数']),'.2%')
uv_4 = data_3[(data_3['day1'] == str(date_1)) & (data_3['push_send_type'] == '个性化非实时')]
uv_4 = uv_4.reset_index(drop = True)
data_gxf_today['独立打开uv'] = uv_4['独立打开uv'][0]
data_gxf_today['人均展示次数'] = round(int(data_gxf_today['展示次数']) / int(data_gxf_today['展示人数']),4)
sq_gxf = data_5[(data_5['day'] == int(date_now))].query("push_send_type_group == '个性化非实时-精编' or push_send_type_group == '个性化非实时-非精编'").reset_index(drop = True)
data_gxf_today['首启用户数'] = sq_gxf['first_open_uv'][0] + sq_gxf['first_open_uv'][1]
data_gxf_today['110万目标首启参考值'] = format(int(data_mb['个性化非实时']))
data_gxf_today['首启率'] = format(int(data_gxf_today['首启用户数']) / int(data_gxf_today['展示次数']),'.2%')
print('Sheet: PUSH日报 - 个性化非实时表已经生成')
# 精编、非精编
data_jingbian_notjingbian = pd.read_excel('个性化非实时数据.xlsx',header = 0,sheet_name = "1-非实时PUSH数据-非实时PUSH数据")
data_jingbian_notjingbian['pv打开率']  = data_jingbian_notjingbian['打开次数'] / data_jingbian_notjingbian['展示次数']
data_jingbian_notjingbian['uv打开率']  = data_jingbian_notjingbian['打开人数'] / data_jingbian_notjingbian['展示人数']
data_jingbian_notjingbian['pv打开率'] = data_jingbian_notjingbian['pv打开率'].apply(lambda x: format(x, '.2%'))
data_jingbian_notjingbian['uv打开率'] = data_jingbian_notjingbian['uv打开率'].apply(lambda x: format(x, '.2%'))
#data_jingbian_notjingbian.loc[data_jingbian_notjingbian['发送类型'].str.contains('11'),'发送类型'] = '精编'
#data_jingbian_notjingbian.loc[data_jingbian_notjingbian['发送类型'].str.contains('17'),'发送类型'] = '非精编'
data_jingbian_notjingbian = data_jingbian_notjingbian.iloc[[1,0],:]
data_jingbian_notjingbian.loc[data_jingbian_notjingbian['发送类型'] == '精编','首启用户数'] = int(sq_usernum_by_date.loc[:,('sum','first_open_uv','个性化非实时-精编')])
data_jingbian_notjingbian.loc[data_jingbian_notjingbian['发送类型'] == '非精编','首启用户数'] = int(sq_usernum_by_date.loc[:,('sum','first_open_uv','个性化非实时-非精编')])
data_jingbian_notjingbian.loc[data_jingbian_notjingbian['发送类型'] == '精编','110万首启参考值'] = 26000
data_jingbian_notjingbian.loc[data_jingbian_notjingbian['发送类型'] == '非精编','110万首启参考值'] = 218000
data_jingbian_notjingbian['日期'] = data_jingbian_notjingbian['日期'].apply(lambda x: str(x).replace('-',''))
print('Sheet: PUSH日报 - 精编、非精编表已经生成')
#other
data_other = data_ql[(data_ql['发送类型'] == 'other') & (data_ql['厂商'] == 'all')]
data_other_today = data.copy()
data_other_today[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] = data_other[['日期','发送类型','展示人数','打开人数','展示次数','打开次数']] 
data_other_today['uv打开率'] = format(int(data_other_today['打开人数']) / int(data_other_today['展示人数']),'.2%')
data_other_today['pv打开率'] = format(int(data_other_today['打开次数']) / int(data_other_today['展示次数']),'.2%')
uv_5 = data_3[(data_3['day1'] == str(date_1)) & (data_3['push_send_type'] == 'other')]
uv_5 = uv_5.reset_index(drop = True)
data_other_today['独立打开uv'] = uv_5['独立打开uv'][0]
data_other_today['人均展示次数'] = round(int(data_other_today['展示次数']) / int(data_other_today['展示人数']),4)
sq_other = data_5[(data_5['day'] == int(date_now)) & (data_5['push_send_type_group'] == 'other')].reset_index(drop = True)
data_other_today['首启用户数'] = sq_other['first_open_uv'][0]
data_other_today['110万目标首启参考值'] = format(int(data_mb['other']))
data_other_today['首启率'] = format(int(data_other_today['首启用户数']) / int(data_other_today['展示次数']),'.2%')
data_push = pd.concat([data_all,data_quanliang,data_gx_today,data_bd_today,data_gxf_today, data_other_today],axis = 0)
print('Sheet: PUSH日报 - other表已经生成')

#各平台推送情况
#1.ios
data_pt = data.copy()
data_pt = data_pt.drop('独立打开uv',axis = 1)
lc = ['日期','平台','展示人数','打开人数','uv打开率','展示次数','打开次数','pv打开率','人均展示次数','首启用户数','110万目标首启参考值','首启率']
lcc = ['日期','平台','展示人数','打开人数','uv打开率','展示次数','打开次数','pv打开率','人均展示次数']
data_pt.columns = lc
data_4.columns = data_4.iloc[0,:]
data_4 = data_4.drop(index = 0,axis = 0).reset_index(drop = True)
data_ios = data_4.query("日期 == @date_now and 平台 == 'ios' and 发送类型 == 'all'")
data_pt_ios = data_pt.copy()
data_pt_ios[lcc] = data_ios[lcc]
data_pt_ios.loc[:,'平台'] ='iOS'

#2.Android
data_ad = data_4.query("日期 == @date_now and 平台 == 'Android' and 发送类型 == 'all'")
data_pt_ad = data_pt.copy()
data_pt_ad[lcc] = data_ad[lcc]

#Android去除华为
data_mh = data_4.query("日期 == @date_now and 平台 == 'Android去除华为' and 发送类型 == 'all'")
data_pt_mh = data_pt.copy()
data_pt_mh[lcc] = data_mh[lcc]

#各推送类型推送概况
#1.华为
mc = ['发送类型','发送人数','到达人数','发送次数','到达次数']
data_hw = data_2.query("日期 == @date_now and 厂商 == '华为' and 发送类型 == 'all'")
data_hw = data_hw.drop(mc,axis = 1)

#2.小米
data_xm = data_2.query("日期 == @date_now and 厂商 == '小米' and 发送类型 == 'all'")
data_xm = data_xm.drop(mc,axis = 1)

#3.OPPO
data_oppo = data_2.query("日期 == @date_now and 厂商 == 'OPPO' and 发送类型 == 'all'")
data_oppo = data_oppo.drop(mc,axis = 1)

#4.VIVO
data_vivo = data_2.query("日期 == @date_now and 厂商 == 'VIVO' and 发送类型 == 'all'")
data_vivo = data_vivo.drop(mc,axis = 1)

#5.三星
data_sx = data_2.query("日期 == @date_now and 厂商 == '三星' and 发送类型 == 'all'")
data_sx = data_sx.drop(mc,axis = 1)

data_xz_1 = pd.concat([data_pt_ios,data_pt_ad,data_pt_mh],axis = 0)
data_xz_2 = pd.concat([data_hw,data_xm,data_oppo,data_vivo,data_sx],axis = 0)
data_xz_1['uv打开率'] = data_xz_1['uv打开率'].astype('float').apply(lambda x: format(x, '.2%'))
data_xz_1['pv打开率'] = data_xz_1['pv打开率'].astype('float').apply(lambda x: format(x, '.2%'))
data_xz_2['uv打开率'] = data_xz_2['uv打开率'].astype('float').apply(lambda x: format(x, '.2%'))
data_xz_2['pv打开率'] = data_xz_2['pv打开率'].astype('float').apply(lambda x: format(x, '.2%'))
#push日报

file7 = 'push日报.xlsx'
data1 = pd.read_excel(file7,sheet_name = 'all')
data1 = pd.concat([data_all.drop('独立打开uv',axis = 1),data1],axis = 0)

data2 = pd.read_excel(file7,sheet_name = '全量')
data2 = pd.concat([data_quanliang,data2],axis = 0)

data3 = pd.read_excel(file7,sheet_name = '个性化实时')
data3 = pd.concat([data_gx_today,data3],axis = 0)

data4 = pd.read_excel(file7,sheet_name = '本地实时')
data4 = pd.concat([data_bd_today,data4],axis = 0)

data5 = pd.read_excel(file7,sheet_name = '个性化非实时')
data5 = pd.concat([data_gxf_today,data5],axis = 0)

data6 = pd.read_excel(file7,sheet_name = 'other')
data6 = pd.concat([data_other_today,data6],axis = 0)

data7 = pd.read_excel(file7,sheet_name = 'ios')
data7 = pd.concat([data_pt_ios,data7],axis = 0)

data8 = pd.read_excel(file7,sheet_name = 'andriod')
data8 = pd.concat([data_pt_ad,data8],axis = 0)

data9 = pd.read_excel(file7,sheet_name = 'Android去除华为')
data9 = pd.concat([data_pt_mh,data9],axis = 0)

data10 = pd.read_excel(file7,sheet_name = '华为')
data10 = pd.concat([data_hw,data10],axis = 0)

data11 = pd.read_excel(file7,sheet_name = '小米')
data11 = pd.concat([data_xm,data11],axis = 0)

data12 = pd.read_excel(file7,sheet_name = 'oppo')
data12 = pd.concat([data_oppo,data12],axis = 0)

data13 = pd.read_excel(file7,sheet_name = 'vivo')
data13 = pd.concat([data_vivo,data13],axis = 0)

data14 = pd.read_excel(file7,sheet_name = '三星')
data14 = pd.concat([data_sx,data14],axis = 0)


## 结束
date = (datetime.datetime.today() + datetime.timedelta(days=dd)).strftime('%Y/%m/%d')

data_11 = pd.read_excel("本地push.xlsx")
for i in range(data_11.shape[0]):
    try:
        data_11['docId或者链接'][i] = data_11['docId或者链接'][i].split('/')[-1].split('.')[0]
    except IndexError:
        data_11['docId或者链接'][i] = data_11['docId或者链接'][i].split('//')[0]
        
#替换push
data_11_replace = data_11[data_11['替换文章所覆盖的pushId'].notna()]
data_11_replace = pd.DataFrame(data_11_replace.groupby('替换文章所覆盖的pushId')[['总首启数','总独立打开','总打开量']].sum())
data_11_replace['替换文章所覆盖的pushId']  = data_11_replace.index
data_11_replace = data_11_replace.reset_index(drop = True)
data_11_replace.columns = ['总首启数替','总独立打开替','总打开量替','pushId']
#data_11_replace.replace(np.nan,0)

#原始push
data_11 = data_11[data_11['替换文章所覆盖的pushId'].isna()]
#data_11 = data_11.drop_duplicates(subset=['docId或者链接','总展示量'],keep = 'first')
if data_11_replace.empty==False:
    print("aaaaaa")
    data_11 = data_11.merge(data_11_replace,how='left',on = 'pushId')
    data_11['总首启数']=data_11['总首启数']+data_11['总首启数替'].replace(np.nan,0)
    data_11['总独立打开']=data_11['总独立打开']+data_11['总独立打开替'].replace(np.nan,0)
    data_11['总打开量']=data_11['总打开量']+data_11['总打开量替'].replace(np.nan,0)
    data_11=data_11.drop(['总首启数替','总独立打开替','总打开量替'],axis = 1)
#data_11.to_excel("eeeeee.xlsx")

data_11 = data_11.drop('替换文章所覆盖的pushId', axis = 1)


# 全量PUSH 表
data_7 = pd.read_excel("全量push.xlsx")
for i in range(data_7.shape[0]):
    try:
        data_7['docId或者链接'][i] = data_7['docId或者链接'][i].split('/')[-1].split('.')[0]
    except IndexError:
        data_7['docId或者链接'][i] = data_7['docId或者链接'][i].split('//')[0]
#首先计算首启和独立打开
#data_doc为替换push，根据docid计算总打开
#doc_7_1为筛选出替换前的push

#替换push
data_doc = data_7[(data_7['替换文章所覆盖的pushId'].notna())]
data_doc_sum = pd.DataFrame(data_doc.groupby('替换文章所覆盖的pushId')[['首启用户数（离线数据）','独立打开用户数','总打开量']].sum())
data_doc_sum['替换文章所覆盖的pushId'] = data_doc_sum.index
data_doc_sum = data_doc_sum.reset_index(drop = True)
data_doc_sum.columns = ['首启用户数替','独立打开用户数替','总打开量替','pushId']

#补发push
data_sup = data_7[data_7["突发性"]=="补发"][['docId或者链接','首启用户数（离线数据）','独立打开用户数','总发送量','总展示量','总打开量']]
data_sup.columns = ['docId或者链接','首启用户数补','独立打开用户数补','总发送量补','总展示量补','总打开量补']

#非替换push
#data_7_1 = data_7.query("标题 != '网易新闻'")
#data_7_1 = data_7.query("突发性 != '补发'")
#data_7_1 = data_7.query("标题 != '网易新闻' and 突发性 != '补发'")
data_7_1 = data_7
data_7_1 = data_7_1[data_7_1['替换文章所覆盖的pushId'].isna()]
#data_7_1 = data_7_1.drop('替换文章所覆盖的pushId', axis = 1)
#data_7_1 = data_7_1.drop_duplicates(subset=['docId或者链接','总展示量'],keep = 'first')
#data_7_1 = data_7_1.iloc[:,:21].drop(['摘要','完成时间','完成状态','总打开量'],axis = 1).reset_index(drop = True)
data_7_1 = data_7_1.loc[:,['标题','pushId','docId或者链接','创建时间','类型','编辑','突发性','城市','屏蔽','过滤用户','过滤客户端活跃','过滤客户端最后活跃','重大主题','正能量','总发送量','总展示量','总打开量','首启用户数（离线数据）','独立打开用户数']]
data_7_1= data_7_1.reset_index(drop = True)
bianji = pd.read_excel("编辑信息.xlsx")
#bianji = bianji.query("编辑 == '要闻'")
bianji_1 = bianji[['用户名','真实姓名','分组']]
bianji_1.columns = ['编辑','中文姓名','分组']
data_7m = data_7_1.merge(bianji_1,on = '编辑')

#data_7m = data_7_1.merge(bianji_1,on = '编辑').drop(['首启用户数（离线数据）','独立打开用户数'],axis = 1)
if data_7m.empty==False:
    #print("--------")
    #print(data_7m)
    data_7m = data_7m.merge(data_doc_sum,how='left',on = 'pushId')
    data_7m = data_7m.merge(data_sup, how='left', on='docId或者链接')
    # data_7m['首启用户数（离线数据）']=data_7m['首启用户数（离线数据）']+data_7m['首启用户数替'].replace(np.nan,0)
    # data_7m['独立打开用户数']=data_7m['独立打开用户数']+data_7m['独立打开用户数替'].replace(np.nan,0)
    # data_7m['总打开量']=data_7m['总打开量']+data_7m['总打开量替'].replace(np.nan,0)
    # data_7m=data_7m.drop(['首启用户数替','独立打开用户数替','总打开量替'],axis = 1)
    data_7m['首启用户数（离线数据）'] = data_7m['首启用户数（离线数据）'] + data_7m['首启用户数替'].replace(np.nan, 0) + data_7m['首启用户数补'].replace(np.nan, 0)
    data_7m['独立打开用户数'] = data_7m['独立打开用户数'] + data_7m['独立打开用户数替'].replace(np.nan,0) + data_7m['独立打开用户数补'].replace(np.nan, 0)
    data_7m['总发送量'] = data_7m['总发送量'] + data_7m['总发送量补'].replace(np.nan, 0)
    data_7m['总展示量'] = data_7m['总展示量'] + data_7m['总展示量补'].replace(np.nan, 0)
    data_7m['总打开量'] = data_7m['总打开量'] + data_7m['总打开量替'].replace(np.nan, 0) + data_7m['总打开量补'].replace(np.nan, 0)
    data_7m = data_7m.drop(['首启用户数替', '独立打开用户数替', '总打开量替', '首启用户数补', '独立打开用户数补', '总发送量补', '总展示量补', '总打开量补'], axis=1)

#data_7_result = pd.concat([data_7m.loc[:,['','','','']],data_7m['中文姓名'],data_7m['编辑'],data_7m['分组'],data_7m.iloc[:,5:8],data_7m.iloc[:,17:],data_7m.iloc[:,8:16]],axis = 1)
data_7_temp = data_7m.loc[:,['标题','docId或者链接','创建时间','类型','中文姓名','编辑','分组','突发性','城市','屏蔽','重大主题','正能量','首启用户数（离线数据）','独立打开用户数','过滤用户','过滤客户端活跃','过滤客户端最后活跃','总发送量','总展示量','总打开量']]
data_7_dimension = data_7m.loc[:,['标题','docId或者链接','创建时间','类型','中文姓名','编辑','分组','突发性','城市','屏蔽','重大主题','正能量','过滤用户','过滤客户端活跃','过滤客户端最后活跃']]
data_7_dimension = data_7_dimension.drop_duplicates(subset = ['标题','docId或者链接'],keep = 'first').reset_index(drop = True)
data_7_data = pd.DataFrame(data_7_temp.groupby(['标题','docId或者链接'])[['首启用户数（离线数据）','独立打开用户数','总发送量','总展示量','总打开量']].sum()).reset_index()
data_7_result = pd.merge(data_7_dimension,data_7_data,how="inner",on=['标题','docId或者链接'])
data_7_result = data_7_result[['标题','docId或者链接','创建时间','类型','中文姓名','编辑','分组','突发性','城市','屏蔽','重大主题','正能量','首启用户数（离线数据）','独立打开用户数','过滤用户','过滤客户端活跃','过滤客户端最后活跃','总发送量','总展示量','总打开量']]
data_7_result['总打开率'] = (data_7_result['总打开量'] / data_7_result['总展示量']).apply(lambda x:format(x,'.2%')) 
data_7_result['首启率'] = (data_7_result['首启用户数（离线数据）'] / data_7_result['总展示量']).apply(lambda x:format(x,'.2%')) 


'''
重大主题字段subject
1 ：重大主题
2 ：非重大主题
0：空


正能量字段positive
1 ：负能量
2 ：正能量
0：空
'''

for i in range(data_7_result.shape[0]):
    if data_7_result.loc[i,'重大主题']==1:
        data_7_result.loc[i,'重大主题'] = '重大主题'
        #print(data_7_result.loc[i,'重大主题'])
    elif data_7_result.loc[i,'重大主题']==2:
        data_7_result.loc[i,'重大主题'] = '非重大主题'
        #print(data_7_result.loc[i,'重大主题'])
    elif data_7_result.loc[i,'重大主题']==0:
        data_7_result.loc[i,'重大主题'] = ''
        #print(data_7_result.loc[i,'重大主题'])
    else:
        #data_7_result['重大主题'][i] = ''
        print("无法匹配")

for i in range(data_7_result.shape[0]):
    if data_7_result.loc[i,'正能量']==1:
        data_7_result.loc[i,'正能量'] = '负能量'
        #print(data_7_result.loc[i,'正能量'])
    elif data_7_result.loc[i,'正能量']==2:
        data_7_result.loc[i,'正能量'] = '正能量'
        #print(data_7_result.loc[i,'正能量'])
    elif data_7_result.loc[i,'正能量']==0:
        data_7_result.loc[i,'正能量'] = ''
        #print(data_7_result.loc[i,'正能量'])
    else:
        #data_7_result['重大主题'][i] = ''
        print("无法匹配")



#个性化PUSH表
# 个性化数据

data_individual = pd.read_excel("个性化Push.xlsx")
#没有开始时间的是待审核的状态
data_individual=data_individual.dropna(subset=["开始时间"])

in_list=[]
for i in data_individual['开始时间']:
    i=str(i)
    in1=time.strptime(i,"%Y-%m-%d %H:%M:%S")
    in2=time.strftime("%Y/%m/%d",in1)
    in_list.append(in2)
data_individual['日期']=in_list
data_individual=data_individual.query("日期 == @date")


gxh=['替换文章所覆盖的pushId','标题','摘要','pushId','docId或者链接','状态','创建时间','发送类型','文章类型','编辑','频道','分类','推送形式', '总发送量','总到达量', '总展示量', '总打开量','首启用户数（离线数据）','过滤用户','客户端活跃度过滤', '地区', '包含视频', '屏蔽城市']
data_individual = data_individual.loc[:,gxh]


#替换push
data_in_replace = data_individual[(data_individual['替换文章所覆盖的pushId'].notna())]
data_in_replace = pd.DataFrame(data_in_replace.groupby('替换文章所覆盖的pushId')[['首启用户数（离线数据）','总打开量']].sum())
data_in_replace['替换文章所覆盖的pushId'] = data_in_replace.index
data_in_replace = data_in_replace.reset_index(drop = True)
data_in_replace.columns = ['首启用户数替','总打开量替','pushId']

#非替换push
data_in_noreplace = data_individual[(data_individual['替换文章所覆盖的pushId'].isna())]
data_in_noreplace = data_in_noreplace .reset_index(drop = True)

if data_in_replace.empty==False:
    data_in_noreplace = pd.merge(data_in_noreplace,data_in_replace,how='left',on = 'pushId')
    data_in_noreplace['首启用户数（离线数据）']=data_in_noreplace['首启用户数（离线数据）']+data_in_noreplace['首启用户数替'].replace(np.nan,0)
    data_in_noreplace['总打开量']=data_in_noreplace['总打开量']+data_in_noreplace['总打开量替'].replace(np.nan,0)
    data_in_noreplace=data_in_noreplace.drop(['首启用户数替','总打开量替'],axis = 1)
data_in_noreplace['总打开率'] = (data_in_noreplace['总打开量'] / data_in_noreplace['总展示量']).apply(lambda x:format(x,'.2%')) 

data_individual = data_in_noreplace.loc[:,gxh]
data_individual  = data_individual.drop('替换文章所覆盖的pushId', axis=1)



# 热点追踪
## 汇总热点追踪
xlsx_flag = [re.search('热点PUSH打开数据', x) is not None 
             for x in files_and_dirs]
xlsxfiles = list(compress(files_and_dirs, xlsx_flag))

for xlsx in xlsxfiles:
    if (xlsxfiles.index(xlsx) == 0):
        data_redian = pd.read_excel(xlsx)
        continue
    temp_data = pd.read_excel(xlsx)
    data_redian = pd.concat([data_redian, temp_data],axis=0)
#获取昨天的日期
date = (datetime.datetime.today() + datetime.timedelta(days=dd)).strftime('%Y/%m/%d')
#判断热点追踪的日期
t_list=[]
for i in data_redian['开始发送时间']:
    i=str(i)
    t1=time.strptime(i,"%Y-%m-%d %H:%M:%S")
    t2=time.strftime("%Y/%m/%d",t1)
    t_list.append(t2)
data_redian['日期']=t_list
#需要的字段
rd=['pushId','链接或docId','标题','摘要','发送范围','提交时间','提交者','首启数','总发送Uv','总展示Uv','总打开Uv']
#选取热点追踪中所需数据
data=data_redian.query("日期 == @date")
data_rd=data[rd]
#填充所需字段
data_rd['发送类型']="热点追踪"
data_rd['文章类型']="doc"
data_rd['频道']="热点追踪"
data_rd['分类']="热点追踪"
data_rd['推送形式']="热点追踪"
data_rd['过滤用户']="不过滤"
data_rd['客户端活跃度过滤']="不过滤"
data_rd['总到达量']=0
data_rd['地区'] = np.nan
data_rd['包含视频'] = np.nan
data_rd['屏蔽城市'] = np.nan
data_rd['总到达量'] = np.nan
#修改格式
data_rd.reset_index(drop = True, inplace = True)
data_rd.rename(columns={'发送范围':'状态','提交时间':'创建时间','提交者':'编辑','首启数':'首启用户数（离线数据）','总发送Uv':'总发送量','总展示Uv':'总展示量','总打开Uv':'总打开量'}, inplace= True)
# 去重
for i in range(data_rd.shape[0]):
    try:
        data_rd['链接或docId'][i] = data_rd['链接或docId'][i].split('/')[-1].split('.')[0]
    except IndexError:
        data_rd['链接或docId'][i] = data_rd['链接或docId'][i].split('//')[0]

data_rd = data_rd.rename(columns = {'链接或docId':'docId或者链接'})

#将热点追踪的数据与个性化中的合并
data_8=pd.concat([data_individual, data_rd],axis=0, ignore_index = True)

for i in range(data_8.shape[0]):
    try:
        data_8['docId或者链接'][i] = data_8['docId或者链接'][i].split('/')[-1].split('.')[0]
    except IndexError:
        data_8['docId或者链接'][i] = data_8['docId或者链接'][i].split('//')[0]
#data_doc_1 = data_8[['pushId','首启用户数（离线数据）']]
#data_doc_1_sum = pd.DataFrame(data_doc_1.groupby('pushId')['首启用户数（离线数据）'].sum())
#data_doc_1_sum['pushId'] = data_doc_1_sum.index
#data_doc_1_sum = data_doc_1_sum.reset_index(drop = True)
# print(list(enumerate(data_8)))
data_8_1 = data_8.iloc[:,:25].drop(['摘要','状态'],axis = 1)
data_8m = data_8_1.merge(bianji_1,on = '编辑', how = 'left')
#data_8m = data_8_1.merge(bianji_1,on = '编辑', how = 'left').drop(['首启用户数（离线数据）'],axis = 1)
#data_8m = data_8m.merge(data_doc_1_sum,on = 'pushId', how = 'left')

# 链接编辑中文姓名
data_8_result = data_8m.loc[:,['标题', 'docId或者链接', '创建时间', '发送类型', '文章类型', '中文姓名', '编辑', '分组','首启用户数（离线数据）', '频道', '分类', '地区', '推送形式', '包含视频', '屏蔽城市', '过滤用户', '总发送量', '总到达量', '总展示量', '总打开量']]
data_8_result['总打开率'] = (data_8_result['总打开量'] / data_8_result['总展示量']).apply(lambda x: format(x, '.2%'))
data_8_result = data_8_result.sort_values(['总打开率'], ascending = False)
#编辑贡献
#1.全量
distribute_1 = data_7_result.query("过滤用户 == '不过滤'")[['中文姓名','编辑','分组','总展示量','总打开量','首启用户数（离线数据）']]
bianji_2 = bianji[['真实姓名','编辑']]
bianji_2.columns = ['中文姓名','编辑分类']
distribute_1 = distribute_1.merge(bianji_2,on = '中文姓名')
dsum_1 = distribute_1[['中文姓名','总展示量','总打开量','首启用户数（离线数据）']].groupby('中文姓名')[['总展示量','总打开量','首启用户数（离线数据）']].sum()
dsum_1['中文姓名'] = dsum_1.index
dsum_1 = dsum_1.reset_index(drop = True)
count1 = pd.DataFrame(distribute_1['中文姓名'].value_counts())
count1['计数'] = count1['count']
count1=count1.drop(columns=['count'],axis=1)
count1['中文姓名'] = count1.index
count1 = count1.reset_index(drop = True)
count1['负责栏目'] = '全量'


#过滤
distribute_q = data_7_result.query("过滤用户 != '不过滤'")[['中文姓名','编辑','分组','总展示量','总打开量','首启用户数（离线数据）']].dropna(subset = ['分组'],axis = 0)
distribute_q = distribute_q.merge(bianji_2,on = '中文姓名')
dsum_q = distribute_q[['中文姓名','总展示量','总打开量','首启用户数（离线数据）']].groupby('中文姓名')[['总展示量','总打开量','首启用户数（离线数据）']].sum()
dsum_q['中文姓名'] = dsum_q.index
dsum_q = dsum_q.reset_index(drop = True)
dsum_q['打开率'] = (dsum_q['总打开量'] / dsum_q['总展示量']).apply(lambda x: format(x, '.2%'))
dsum_q['贡献度'] = round(dsum_q['总打开量']**2 / dsum_q['总展示量'],0)
countq = pd.DataFrame(distribute_q['中文姓名'].value_counts())
countq['计数'] = countq['count']
countq=countq.drop(columns=['count'],axis=1)
countq['中文姓名'] = countq.index
countq = countq.reset_index(drop = True)
countq['负责栏目'] = '全量' 
countq['发送用户'] = '过滤'

# 23.9.26
data_8_result = data_8_result.reset_index(drop = True)
ql_mingxi = data_7_result[['docId或者链接','中文姓名','编辑','分组','首启用户数（离线数据）','过滤用户','总展示量','总打开量']]
gxh_mingxi = data_8_result[['docId或者链接','中文姓名','编辑','分组','首启用户数（离线数据）','过滤用户','总展示量','总打开量']]
ql_mingxi['PUSH类型'] = '全量'
gxh_mingxi['PUSH类型'] = '个性化'
com_ql_gxh = pd.concat([ql_mingxi,gxh_mingxi],axis = 0).reset_index(drop = True)
com_ql_gxh_cac = com_ql_gxh.groupby(['中文姓名','编辑','分组','PUSH类型','过滤用户'],as_index=False).agg({'docId或者链接':['count', 'nunique'],'总展示量':'sum','总打开量':'sum','首启用户数（离线数据）':'sum'})
com_ql_gxh_cac.columns = com_ql_gxh_cac.columns.droplevel(0)
com_ql_gxh_cac = com_ql_gxh_cac.reset_index(drop = True).rename_axis(None, axis=1)
com_ql_gxh_cac.columns = ['编辑','编辑ID','分组','PUSH类型','过滤用户','发送条数','去重发送条数','总展示量','总打开量','首启用户数（离线数据）']

com_ql_gxh_cac_gr = com_ql_gxh_cac.groupby(['编辑','编辑ID','分组','过滤用户']).sum()
com_ql_gxh_cac_gr_com = com_ql_gxh_cac.reset_index().groupby(['编辑','编辑ID','分组','过滤用户'])[['PUSH类型']].apply('+'.join).reset_index()
com_ql_gxh_cac_gr_result = pd.merge(com_ql_gxh_cac_gr, com_ql_gxh_cac_gr_com,on='编辑ID',how = 'inner')
com_ql_gxh_cac_gr_result = com_ql_gxh_cac_gr_result[['编辑','编辑ID','分组','PUSH类型','过滤用户','发送条数','去重发送条数','总展示量','总打开量','首启用户数（离线数据）']]
contribute_result = pd.concat([com_ql_gxh_cac,com_ql_gxh_cac_gr_result],axis = 0).reset_index(drop = True)
contribute_result = contribute_result.sort_values(by=['编辑', '总展示量'], ascending=[True, True]).reset_index(drop = True)
contribute_result = contribute_result.drop_duplicates().reset_index(drop = True)
# 贡献度计算
contribute_result['打开率'] = (contribute_result['总打开量'] / contribute_result['总展示量']).apply(lambda x: format(x, '.2%'))
contribute_result['贡献度'] = round(contribute_result['总打开量']**2 / contribute_result['总展示量'],0)
contribute_result = contribute_result[['编辑','编辑ID','分组','PUSH类型','过滤用户','发送条数','去重发送条数','总展示量','总打开量','打开率','首启用户数（离线数据）','贡献度']]

#2.个性化
distribute_2 = data_8_result.query("过滤用户 == '不过滤'")[['中文姓名','编辑','分组','总展示量','总打开量','首启用户数（离线数据）']].dropna(subset = ['分组'],axis = 0)
distribute_2 = distribute_2.merge(bianji_2,on = '中文姓名')
dsum2 = distribute_2[['中文姓名','总展示量','总打开量','首启用户数（离线数据）']].groupby('中文姓名')[['总展示量','总打开量','首启用户数（离线数据）']].sum()
dsum2['中文姓名'] = dsum2.index
dsum2 = dsum2.reset_index(drop = True)
count2 = pd.DataFrame(distribute_2['中文姓名'].value_counts())
count2['计数'] = count2['count']
count2=count2.drop(columns=['count'],axis=1)
count2['中文姓名'] = count2.index
count2 = count2.reset_index(drop = True)
count2['负责栏目'] = '个性化' 
#过滤
distribute_3 = data_8_result.query("过滤用户 != '不过滤'")[['中文姓名','编辑','分组','总展示量','总打开量','首启用户数（离线数据）']].dropna(subset = ['分组'],axis = 0)
distribute_3 = distribute_3.merge(bianji_2,on = '中文姓名')
dsum_2 = distribute_3[['中文姓名','总展示量','总打开量','首启用户数（离线数据）']].groupby('中文姓名')[['总展示量','总打开量','首启用户数（离线数据）']].sum()
dsum_2['中文姓名'] = dsum_2.index
dsum_2 = dsum_2.reset_index(drop = True)
dsum_2['打开率'] = (dsum_2['总打开量'] / dsum_2['总展示量']).apply(lambda x: format(x, '.2%'))
dsum_2['贡献度'] = round(dsum_2['总打开量']**2 / dsum_2['总展示量'],0)
count3 = pd.DataFrame(distribute_3['中文姓名'].value_counts())
count3['计数'] = count3['count']
count3=count3.drop(columns=['count'],axis=1)
count3['中文姓名'] = count3.index
count3 = count3.reset_index(drop = True)
count3['负责栏目'] = '个性化' 
count3['发送用户'] = '过滤'

#3.贡献
count_sum = count1.merge(count2,on = '中文姓名',how = 'outer')
count_sum['计数'] = count_sum['计数_x'].fillna(0) + count_sum['计数_y'].fillna(0)
count_sum['负责栏目'] = count_sum['负责栏目_x'].astype('str') + '、' + count_sum['负责栏目_y'].astype('str')
count_sum['负责栏目'] = count_sum['负责栏目'].replace('全量、nan','全量')
count_sum['负责栏目'] = count_sum['负责栏目'].replace('nan、个性化','个性化')
count_result = count_sum[['中文姓名','计数','负责栏目']]
dsum = dsum_1.merge(dsum2,on = '中文姓名',how = 'outer')
dsum['总展示'] = dsum['总展示量_x'].fillna(0) + dsum['总展示量_y'].fillna(0)
dsum['总打开'] = dsum['总打开量_x'].fillna(0) + dsum['总打开量_y'].fillna(0)
dsum['打开率'] = (dsum['总打开'] / dsum['总展示']).apply(lambda x: format(x, '.2%'))
dsum['首启用户数（离线数据）'] = dsum['首启用户数（离线数据）_x'].fillna(0) + dsum['首启用户数（离线数据）_y'].fillna(0)
dsum['贡献度'] = round(dsum['总打开']**2 / dsum['总展示'],0)
dsum_result = dsum[['中文姓名','总展示','总打开','打开率','首启用户数（离线数据）','贡献度']]
distribute = dsum_result.merge(count_result,on  = '中文姓名')
bianji_3 = bianji[['用户名','真实姓名','编辑','分组']]
bianji_3.columns = ['用户名','中文姓名','编辑分类','分组']
distribute_result = distribute.merge(bianji_3,on = '中文姓名')
distribute_result['发送用户'] = '不过滤'
distribute_result = distribute_result[['中文姓名','用户名','发送用户','编辑分类','分组','负责栏目','计数','总展示', '总打开','打开率', '首启用户数（离线数据）','贡献度']]
distribute_result.columns = ['编辑','编辑ID','发送用户','编辑分类', '分组', '负责栏目','发送条数', '总展示', '总打开', '打开率', '首启用户数（离线数据）','贡献度']

distribute_resultq = dsum_q.merge(countq,on = '中文姓名')
distribute_resultq = distribute_resultq.merge(bianji_3,on = '中文姓名')
distribute_resultq= distribute_resultq[['中文姓名','用户名','发送用户','编辑分类','分组','负责栏目','计数','总展示量', '总打开量','打开率', '首启用户数（离线数据）','贡献度']]
distribute_resultq.columns = distribute_result.columns

distribute_result1 = dsum_2.merge(count3,on = '中文姓名')
distribute_result1 = distribute_result1.merge(bianji_3,on = '中文姓名')
distribute_result1= distribute_result1[['中文姓名','用户名','发送用户','编辑分类','分组','负责栏目','计数','总展示量', '总打开量','打开率', '首启用户数（离线数据）','贡献度']]
distribute_result1.columns = distribute_result.columns

# 编辑贡献情况表
#2021.3.8-新增细分类型各编辑贡献度
pushtotal = count1.merge(dsum_1,on = '中文姓名',how = 'outer')
pushpersonal = count2.merge(dsum2,on = '中文姓名',how = 'outer')

pushtotal['贡献度'] = round(pushtotal['总打开量']**2 / pushtotal['总展示量'],0)
pushpersonal['贡献度'] = round(pushpersonal['总打开量']**2 / pushpersonal['总展示量'],0)
pushtotal['发送用户']='不过滤'
pushpersonal['发送用户']='不过滤'
pushtotal = pushtotal.merge(bianji_3,on = '中文姓名')
pushpersonal = pushpersonal.merge(bianji_3,on = '中文姓名')
pushtotal['打开率'] = (pushtotal['总打开量'] / pushtotal['总展示量']).apply(lambda x: format(x, '.2%'))
pushpersonal['打开率'] = (pushpersonal['总打开量'] / pushpersonal['总展示量']).apply(lambda x: format(x, '.2%'))
pushtotal = pushtotal[['中文姓名','用户名','发送用户','编辑分类','分组','负责栏目','计数','总展示量', '总打开量','打开率', '首启用户数（离线数据）','贡献度']]
pushpersonal = pushpersonal[['中文姓名','用户名','发送用户','编辑分类','分组','负责栏目','计数','总展示量', '总打开量','打开率', '首启用户数（离线数据）','贡献度']]
pushtotal.columns = distribute_result.columns
pushpersonal.columns = distribute_result.columns

result = pd.concat([distribute_result,pushtotal,pushpersonal,distribute_result1,distribute_resultq],axis = 0)
result = result.drop_duplicates()
result = result.sort_values(by=['发送用户', '分组','编辑'])

editor = bianji.query("编辑 == '要闻'")[['用户名','真实姓名']]
editor.columns = ['编辑','中文姓名']
today_pb = editor[['编辑','中文姓名']]
data_area = data_11[['编辑','地区']]
for i in range(data_area.shape[0]):
    data_area['地区'][i] = data_area['地区'][i].split(',')[0].split('-')[0]
data_11_1 = data_area.merge(today_pb[['编辑','中文姓名']],on = '编辑')
#data_local_push_num = data_11[['编辑','docId或者链接']].drop_duplicates()
data_local_push_num = data_11[['编辑','docId或者链接']]
#data_local_push_num = pd.DataFrame(data_local_push_num.groupby('编辑')['docId或者链接'].nunique())
#data_local_push_num = pd.DataFrame(data_local_push_num.groupby('编辑')['docId或者链接'].count())
data_local_push_num = pd.DataFrame(data_local_push_num.groupby(['编辑']).agg({'docId或者链接':['count','nunique']}))
data_local_push_num.columns = ['发布Push数','发布Push数-去重']
#print("-----------------------------")
#print(data_local_push_num)
#print("-----------------------------")
data_local_push_num['编辑'] = data_local_push_num.index
data_local_push_num = data_local_push_num.reset_index(drop = True)

data_local_push_num = data_local_push_num.merge(today_pb[['编辑','中文姓名']],on = '编辑')
data_local_push_num = data_local_push_num.drop('编辑',axis=1)
data_local_push_num.columns=['发布Push数','发布Push数-去重','编辑']

data_11_2 = data_11_1.drop_duplicates(subset = ['地区','中文姓名'],keep = 'first').reset_index(drop = True)
list3 = []
list4 = []
for a in set(data_11_2['地区']):
    list3.append(a)
    data_11_3 = data_11_2.query("地区 == @a").reset_index(drop = True)['中文姓名']
    if data_11_2.query("地区 == @a").shape[0] == 1:
        list4.append(data_11_3[0])
    else:
        for b in range(data_11_2.query("地区 == @a").shape[0] - 1):
            data_11_3[b+1] = data_11_3[b] + ' ' + data_11_3[b+1]
        list4.append(data_11_3[b+1])
data_11_4 = pd.DataFrame(list3,columns = ['负责地域'])
data_11_5 = pd.DataFrame(list4,columns = ['编辑'])
data_11_result = pd.concat([data_11_4,data_11_5],axis = 1)

provice_a = pd.read_excel("省份维度完成情况.xlsx",sheet_name="areaA")
provice_b = pd.read_excel("省份维度完成情况.xlsx",sheet_name="areaB")
province = pd.concat([provice_a, provice_b], axis = 0)
province = province.merge(province_new_aim,how = "left",on="省份")
province = province.drop(['目标值'],axis = 1)
province = province.rename(columns={'目标值new':'目标值'})

#7.20 设置上海市目标值为40000
#province.loc[province['省份']=="上海市",'目标值'] = 40000

data_13 = province[['省份','已完成','目标值']].copy().reset_index(drop = True)
data_13.columns = ['负责地域','负责地域打开UV','负责地域目标打开UV']
bd_result = data_13.merge(data_11_result,on = '负责地域',how = 'outer')
bd_result['目标完成情况'] = (bd_result['负责地域打开UV'] / bd_result['负责地域目标打开UV']).apply(lambda x:format(x,'.2%'))
bd_result = bd_result[['编辑','负责地域','负责地域打开UV','负责地域目标打开UV','目标完成情况']]

data_11_6 = data_11_2[['地区','中文姓名']].query("地区 != '北京市'")
data_11_6.columns = ['负责地域','编辑']

bd_result_1 = data_11_6.merge(data_13,on ='负责地域' )
bd_result_2 = bd_result_1[['编辑','负责地域打开UV','负责地域目标打开UV']]
push_bd = bd_result_2.groupby('编辑')[['负责地域打开UV','负责地域目标打开UV']].sum()
push_bd['编辑'] = push_bd.index
push_bd = push_bd.reset_index(drop = True)
push_bd['超额完成'] = 999
#分解DOCID
bd_uv = data_11[['pushId','类型','编辑','总展示量','总打开量']]
bd_uv_m = bd_uv.merge(bianji_1[['编辑','中文姓名']],on = '编辑')
bd_uv_sum = pd.DataFrame(bd_uv_m[['中文姓名','总展示量','总打开量']].groupby('中文姓名')[['总展示量','总打开量']].sum())
bd_uv_sum['编辑'] = bd_uv_sum.index
bd_uv_sum.columns = ['编辑展示量','本人贡献pv','编辑']
bd_uv_sum = bd_uv_sum.reset_index(drop = True)
push_bd['是否达标'] = '999和本信息意味着还未进行计算'
push_result = push_bd.merge(bd_uv_sum,on = '编辑', how = 'outer')
'''
file13 = input("Please input filename(本地编辑工作完成情况):")
'''
data_bj = pd.read_excel("本地编辑工作完成情况.xlsx")
data_bj = data_bj[['编辑姓名','展示uv','打开uv','打开率']]
#data_bj = data_bj.iloc[:,3:]
data_bj.columns = ['编辑','展示uv','打开uv','uv打开率']
data_bj_1 = push_result[['编辑','负责地域目标打开UV','编辑展示量','本人贡献pv']].merge(data_bj,on = '编辑')
data_bj_1['本人贡献uv'] = data_bj_1['打开uv']
data_bj_1['展示量'] = data_bj_1['编辑展示量']
data_bj_1['打开量'] = data_bj_1['本人贡献pv']
data_bj_1['pv打开率'] = (data_bj_1['打开量'] / data_bj_1['展示量'] ).map(lambda x:format(x,'%'))
data_bj_1['负责地域目标打开UV'] = round((data_bj_1['负责地域目标打开UV'] / 2),0)
data_bj_1['超额完成'] = data_bj_1['本人贡献uv'] - data_bj_1['负责地域目标打开UV']
data_bj_1['是否达标'] = 0
for i in range(data_bj_1.shape[0]):
    if data_bj_1['超额完成'][i] >= 0:
        data_bj_1['是否达标'][i] = '达标'
    else:
        data_bj_1['是否达标'][i] = '不达标'

data_bj_result = data_bj_1[['编辑','本人贡献uv','负责地域目标打开UV','超额完成','是否达标','展示uv','打开uv','展示量','打开量','uv打开率','pv打开率']]
numbers = pd.DataFrame(data_11_1['中文姓名'].value_counts(),columns=['计数'])
#numbers['计数'] = numbers['中文姓名']
numbers['中文姓名'] = numbers.index
numbers = numbers.reset_index(drop = True)
numbers.columns = ['编辑','发布Push数']
bd_gx = data_bj_1[['编辑','打开uv','uv打开率']].merge(numbers,on = '编辑')
bd_gx['贡献度'] = round((bd_gx['打开uv']**2 / data_bj_result['展示uv']),0)
bd_gx['负责栏目'] = '本地'
bd_gx_result = bd_gx[['编辑','打开uv','贡献度','uv打开率','发布Push数','负责栏目']]

# 编辑完成情况

'''
provice_a = pd.read_excel("省份维度完成情况.xlsx",sheet_name="areaA")
provice_b = pd.read_excel("省份维度完成情况.xlsx",sheet_name="areaB")
province = pd.concat([provice_a, provice_b], axis = 0)
province.loc[province['省份']=="上海市",'目标值'] = 60000
'''

lahuo = pd.read_excel('分工-增长.xlsx',sheet_name="分工",index_col=0)
province_assign = pd.read_excel('省份-区域-23.10.12.xlsx',index_col=0) #TODO 替换本行文件名
daterange = lahuo.iloc[0,:].apply(lambda x: x.strftime('%Y-%m-%d'))

# 从拉活表中匹配今日数据
report_day = (datetime.date.today() + datetime.timedelta(days=dd)).strftime('%Y-%m-%d')
report_day_col_index = daterange[daterange == report_day].index
paiban_raw = lahuo.loc[:,report_day_col_index]
paiban_raw.columns = ['值班人员']

'''
# 当只有两个人值班时，三区由非精编负责
# 判断是否有这种情况
def if_xiaoqu(paiban):
    pm_start_index = list(paiban.index).index('下午班')
    am = paiban.iloc[0:pm_start_index,:].copy()
    pm = paiban.iloc[pm_start_index:,:].copy()
    if (pd.isnull(am.loc['本地三区','值班人员'])):
        am.loc['本地三区','值班人员'] = am.loc['600条非经编+（本地两人班次时的三区）','值班人员']
    if (pd.isnull(pm.loc['本地三区','值班人员'])):
        pm.loc['本地三区','值班人员'] = pm.loc['600条非经编+（本地两人班次时的三区）','值班人员']
    paiban_new = pd.concat([am, pm], axis = 0)
    return(am, pm, paiban_new)
'''

def if_xiaoqu(paiban):
    pm_start_index = list(paiban.index).index('下午班')
    am = paiban.iloc[0:pm_start_index,:].copy()
    pm = paiban.iloc[pm_start_index:,:].copy()
    paiban_new = pd.concat([am, pm], axis = 0)
    return(am, pm, paiban_new)



paiban_am_xiaoqu, paiban_pm_xiaoqu,paiban = if_xiaoqu(paiban_raw)

# 除广东外
# 分配判断上下午的排班方法，并且对照到省份-区域表中
pm_start_index_raw = list(paiban_raw.index).index('下午班')
paiban_am_raw = paiban_raw.iloc[0:pm_start_index_raw,:].copy()
paiban_pm_raw = paiban_raw.iloc[pm_start_index_raw:,:].copy()
# 判断人数情况
#fengong_index = 4 - paiban_am_raw.loc[['本地一区','本地二区','本地三区','本地四区'],:].isna().sum()
#判断是否有小三区，如有，fengong_index为5，否则为正常值

if (pd.isnull(paiban_am_raw.loc['本地所有','值班人员'])):
    #fengong_index = 6 - paiban_am_raw.loc[['本地一区','本地二区'],:].isna().sum()
    fengong_index = 2
else:
    fengong_index = 6
    '''
if (pd.isnull(paiban_am_raw.loc['本地小三区','值班人员'])):
    fengong_index = 5 - paiban_am_raw.loc[['本地一区','本地二区','本地三区','本地小三区','本地四区'],:].isna().sum()
else:
    fengong_index = 5
    '''
#fengong_index = 4 - paiban_am_raw.loc[['本地一区','本地二区','本地三区','本地小三区','本地四区'],:].isna().sum()
Temp1Index = list(paiban_am_xiaoqu.index).index('本地一区')
Temp4Index = list(paiban_am_xiaoqu.index).index('本地所有')+1
#TempX3Index = list(paiban_am_xiaoqu.index).index('审核+早读+本地小四区')
paiban_am = paiban_am_xiaoqu.iloc[Temp1Index:Temp4Index,:]
#paiban_am = paiban_am.drop(['600条非精编+35条非精编','新闻监控','审核+早读+104本地运营'])
#paiban_am.rename(index={'审核+早读+本地小四区':'本地小四区'},inplace=True)
paiban_am.columns = ['编辑']
paiban_am['区域'] = paiban_am.index
province_area_am = pd.DataFrame(province_assign[fengong_index])
province_area_am.columns = ['区域']
province_area_am['省份'] = province_area_am.index

# 将编辑、区域和班次拼接到表中
bd_am_detail = province_area_am.copy()
bd_am_detail = bd_am_detail.merge(paiban_am, on='区域', how = 'left')
bd_am_detail['班次'] = '早班'

# the same to 下午
#fengong_index = 4 - paiban_pm_raw.loc[['本地一区','本地二区','本地三区','本地四区'],:].isna().sum()

if (pd.isnull(paiban_pm_raw.loc['本地所有','值班人员'])):
    #fengong_index = 6 - paiban_pm_raw.loc[['本地一区','本地二区'],:].isna().sum()
    fengong_index = 2
else:
    fengong_index = 6

'''
if (pd.isnull(paiban_pm_raw.loc['本地小三区','值班人员'])):
    fengong_index = 5 - paiban_pm_raw.loc[['本地一区','本地二区','本地三区','本地小三区','本地四区'],:].isna().sum()
else:
    fengong_index = 5
    '''
Temp1Index = list(paiban_pm_xiaoqu.index).index('本地一区')
Temp4Index = list(paiban_pm_xiaoqu.index).index('本地所有')+1
#TempX3Index = list(paiban_pm_xiaoqu.index).index('审核+查重+本地小四区')
paiban_pm = paiban_pm_xiaoqu.iloc[Temp1Index:Temp4Index ,:]
#paiban_pm = paiban_pm.drop(['600条非精编+35条非精编','新闻监控','审核+查重+104本地运营'])
#paiban_pm.rename(index={'审核+查重+本地小四区':'本地小四区'},inplace=True)
paiban_pm.columns = ['编辑']
paiban_pm['区域'] = paiban_pm.index
province_area_pm = pd.DataFrame(province_assign[fengong_index])
province_area_pm.columns = ['区域']
province_area_pm['省份'] = province_area_pm.index

# 将编辑、区域和班次拼接到表中
bd_pm_detail = province_area_pm.copy()
bd_pm_detail = bd_pm_detail.merge(paiban_pm, on='区域', how = 'left')
bd_pm_detail['班次'] = '下午班'

# 获得省份表-编辑表
bd_final_result = province.loc[:,['省份','已完成','目标值']]
bd_final_result.columns = ['负责地域','负责地域打开UV','负责地域目标打开UV']
bd_final_result = bd_result.loc[:,['编辑','负责地域']].merge(bd_final_result, how = 'left', on = '负责地域')
bd_final_result['目标完成情况'] = (bd_final_result['负责地域打开UV'] / bd_final_result['负责地域目标打开UV']).apply(lambda x:format(x,'.2%'))
bd_ampm = bd_am_detail.loc[:,['省份','编辑']].merge(bd_pm_detail.loc[:,['省份','编辑']],how = 'left',on = '省份')
bd_ampm.columns = ['省份','早班编辑','下午班编辑']
bd_ampm['值班人员'] = bd_ampm.早班编辑 + ' ' + bd_ampm.下午班编辑.fillna(' ')
bd_final_result = bd_final_result.merge(pd.DataFrame(bd_ampm.loc[:,['省份','值班人员']]), how = 'left', left_on = '负责地域', right_on = '省份' )
## 删除不用的编辑
bd_final_result['编辑'] = bd_final_result['值班人员']
bd_final_result = bd_final_result.drop('值班人员',axis=1)
bd_final_result = bd_final_result.drop('省份',axis=1)
## 匹配测试组数据
paibanTemp = paiban.iloc[1:,:]
#gd_editors = ' '.join(list(paibanTemp.loc[paibanTemp.index.str.contains('广东'),'值班人员'].dropna()))
#jz_editors = ' '.join(list(paibanTemp.loc[paibanTemp.index.str.contains('苏浙'),'值班人员'].dropna()))
#bd_final_result.loc[bd_final_result['负责地域'] == '广东省', '编辑'] = gd_editors
#bd_final_result.loc[bd_final_result['负责地域'].isin(['江苏省','浙江省']), '编辑'] = jz_editors

# 重新计算有关的目标值
bd_with_num = province.loc[:,['省份','已完成','目标值','15:00的目标值','文章数']]
bd_with_num = bd_with_num.merge(bd_ampm, how = 'left', on = '省份')
bd_with_num = bd_with_num.rename(columns = {'早班编辑':'值班人员1','下午班编辑':'值班人员2'})
## 计算每个目标班次人数，方便进行计算
## result0是971行的
bd_with_num['负责人数'] = bd_with_num.loc[:,['值班人员1','值班人员2']].apply(lambda x: x.count(), axis=1)
bd_with_num['按人数分摊目标值'] = bd_with_num['目标值'] / bd_with_num['负责人数']
## 对data_bj_result中，非广东的编辑进行更新
## 对广东编辑进行目标删除处理
### 识别关键词：广东; index有空值时会报错，临时替换成‘%’请注意
paiban = paiban.rename(index = {'审核+早读+本地小四区':'本地小四区','审核+查重+本地小四区':'本地小四区'})
local_flag = [re.search(r'本地小四|本地一|本地二|本地三|本地四|本地小三|粤沪|苏浙|本地所有', x) is not None for x in paiban.index.fillna('%')]
#keyword_flag = [re.search('粤沪', x) is not None for x in paiban.index.fillna('%')]
#keyword2_flag = [re.search('苏浙', x) is not None for x in paiban.index.fillna('%')]
keyword_bj_flag = paiban.copy()
keyword_bj_flag['是否本地push'] = local_flag
#keyword_bj_flag['是否负责粤沪'] = keyword_flag
#keyword_bj_flag['是否负责苏浙'] = keyword2_flag
keyword_bj_flag = keyword_bj_flag.dropna()
keyword_bj_flag = keyword_bj_flag.iloc[1:,:]
### 开始为本地计算目标
for i in range(0,keyword_bj_flag.shape[0]):
    editor_name = keyword_bj_flag['值班人员'][i]
    delta = 0 # 一区要多加两万
    if keyword_bj_flag['是否本地push'][i] == False:
        continue   
    else:
        # 计算目标额
        editor_flag = [re.search(editor_name, x) is not None for x in bd_with_num['值班人员'].fillna('%')]
        temp_bd_by_editor = bd_with_num.copy()
        temp_bd_by_editor['编辑是否负责'] = editor_flag
        if re.search('一区',keyword_bj_flag.index[i]) is not None:
            delta = 0
        target_per_editor = math.ceil(sum(temp_bd_by_editor[temp_bd_by_editor['编辑是否负责'] == True]['按人数分摊目标值'])) + delta
        data_bj_result.loc[data_bj_result['编辑'] == editor_name, '负责地域目标打开UV'] = target_per_editor

data_bj_result = data_bj_result.reset_index(drop = True)
data_bj_result['超额完成'] = data_bj_result['本人贡献uv'] - data_bj_result['负责地域目标打开UV']
data_bj_result['是否达标'] = '0'
for i in range(0,data_bj_result.shape[0]):
    if data_bj_result.loc[i,'超额完成'] >= 0:
        data_bj_result.loc[i,'是否达标'] = '达标'
    else:
        data_bj_result.loc[i,'是否达标'] = '不达标' 
## 自定义排序，早班，一区、二区、三区、四区   <- 从加工后的排班表获得
paiban_index = paiban.copy().iloc[1:,:]
paiban_index['区域'] = paiban_index.index
paiban_index['早晚班'] = '0'
pm_start_index = list(paiban_index.index).index('下午班')
paiban_index.iloc[0:pm_start_index, paiban_index.columns.get_loc('早晚班')] = '早班'
#paiban_index.loc[0:pm_start_index, '早晚班'] = '早班'
paiban_index.iloc[pm_start_index:, paiban_index.columns.get_loc('早晚班')] = '下午班'
#paiban_index.loc[pm_start_index:, '早晚班'] = '下午班'
paiban_index = paiban_index.dropna(axis = 0)
paiban_index = paiban_index.loc[paiban_index['区域'].str.contains(r'本地小四|本地一|本地二|本地三|本地四|本地小三|粤沪|苏浙|本地所有'),:]

# 需要对测试组的分工情况进判断，如果两个人，则区分AB
'''
if sum(keyword_bj_flag['是否负责广东']) > 2:
    # 可能出现上午一人下午三人的情况
    if sum(keyword_bj_flag['是否负责广东']) == 3:
        temp = list(set(paiban_index.index[paiban_index.index.str.contains('广东')]))
        splitNo = list(paiban_index.index[paiban_index.index.str.contains('广东')][1:]).index(temp[0])+1
        if paiban_index.loc[paiban_index['区域'].str.contains('广东'),'值班人员'][:splitNo].notnull().sum() <= 1:
           paiban_index.loc[paiban_index.index.str.contains('广东')&paiban_index.index.str.contains('A'),'区域'] = '广东A'
           paiban_index.loc[paiban_index.index.str.contains('广东')&paiban_index.index.str.contains('B'),'区域'] = '广东B'
           tempIndex = [list(paiban_index.index).index(temp[0])]
           paiban_index.iloc[tempIndex,1] = '广东'
        if paiban_index.loc[paiban_index['区域'].str.contains('广东'),'值班人员'][splitNo:].notnull().sum() <= 1:
           paiban_index.loc[paiban_index.index.str.contains('广东')&paiban_index.index.str.contains('A'),'区域'] = '广东A'
           paiban_index.loc[paiban_index.index.str.contains('广东')&paiban_index.index.str.contains('B'),'区域'] = '广东B'
           temp2 = list(paiban_index.index)
           temp2[:int(len(temp2)/2)] = ['999']*int(len(temp2)/2)
           tempIndex = [list(temp2).index(temp[0])]
           paiban_index.iloc[tempIndex,1] = '广东'
    else:
        paiban_index.loc[paiban_index.index.str.contains('广东')&paiban_index.index.str.contains('A'),'区域'] = '广东A'
        paiban_index.loc[paiban_index.index.str.contains('广东')&paiban_index.index.str.contains('B'),'区域'] = '广东B'
else:
    paiban_index.loc[paiban_index['区域'].str.contains('广东'),'区域'] = '广东'

if sum(keyword_bj_flag['是否负责江浙']) > 2:
    # 可能出现上午一人下午三人的情况
    if sum(keyword_bj_flag['是否负责江浙']) == 3:
        temp = list(set(paiban_index.index[paiban_index.index.str.contains('苏浙')]))
        splitNo = list(paiban_index.index[paiban_index.index.str.contains('苏浙')][1:]).index(temp[0])+1
        if paiban_index.loc[paiban_index['区域'].str.contains('苏浙'),'值班人员'][:splitNo].notnull().sum() <= 1:
           paiban_index.loc[paiban_index.index.str.contains('苏浙')&paiban_index.index.str.contains('A'),'区域'] = '江浙A'
           paiban_index.loc[paiban_index.index.str.contains('苏浙')&paiban_index.index.str.contains('B'),'区域'] = '江浙B'
           tempIndex = [list(paiban_index.index).index(temp[0])]
           paiban_index.iloc[tempIndex,1] = '江浙'
        if paiban_index.loc[paiban_index['区域'].str.contains('苏浙'),'值班人员'][splitNo:].notnull().sum() <= 1:
           paiban_index.loc[paiban_index.index.str.contains('苏浙')&paiban_index.index.str.contains('A'),'区域'] = '江浙A'
           paiban_index.loc[paiban_index.index.str.contains('苏浙')&paiban_index.index.str.contains('B'),'区域'] = '江浙B'
           temp2 = list(paiban_index.index)
           temp2[:int(len(temp2)/2)] = ['999']*int(len(temp2)/2)
           tempIndex = [list(temp2).index(temp[0])] + [list(temp2).index(temp[1])]
           paiban_index.iloc[tempIndex,1] = '苏浙'
    else:
        paiban_index.loc[paiban_index.index.str.contains('苏浙')&paiban_index.index.str.contains('A'),'区域'] = '江浙A'
        paiban_index.loc[paiban_index.index.str.contains('苏浙')&paiban_index.index.str.contains('B'),'区域'] = '江浙B'
else:
    paiban_index.loc[paiban_index['区域'].str.contains('苏浙'),'区域'] = '江浙'
'''
## 对行、列重新排序，广东要移到最后
paiban_index = paiban_index.loc[:,['早晚班','区域','值班人员']]
#paiban_index_gd = paiban_index.loc[paiban_index['区域'].isin(['广东','江浙','广东A','广东B','江浙A','江浙B']),:]
paiban_index_not_gd = paiban_index.loc[paiban_index['区域'].isin(['广东','江浙','广东A','广东B','江浙A','江浙B']) == False,:]
#paiban_index = pd.concat([paiban_index_not_gd, paiban_index_gd], axis = 0)
paiban_index = paiban_index_not_gd
paiban_index = paiban_index.reset_index(drop = True)
paiban_index = paiban_index.rename(columns = {'值班人员':'编辑'})
## 最终数据，广东的负责地域目标打开UV	超额完成	是否达标为空
data_bj_result = paiban_index.merge(data_bj_result, on = '编辑', how = 'left')
#data_bj_result.loc[data_bj_result['区域'].isin(['广东','江浙','广东A','广东B','江浙A','江浙B']), ['负责地域目标打开UV','超额完成','是否达标']] = np.nan
#22.5.24 新增本地push条数计算
data_bj_result = data_bj_result.merge(data_local_push_num,on='编辑',how='left')
data_bj_result['日期']=(datetime.date.today() + datetime.timedelta(days=dd))
data_bj_result = data_bj_result[['早晚班','区域','编辑','发布Push数','发布Push数-去重','本人贡献uv','负责地域目标打开UV','超额完成','是否达标','展示uv','打开uv','展示量','打开量','uv打开率','pv打开率','日期']]


# 24.4.19 新增非实时每日编辑审核量
editor_nrt_content_num = pd.read_excel('个性化非实时数据.xlsx',sheet_name = "2-编辑审核文章量-审核文章量")
paiban_nrt = paiban_raw.loc["精编、非精编（正常班）"].dropna()
#paiban_nrt = paiban_nrt.rename(columns={'值班人员': '编辑'}, inplace=True)

#result_nrt_content_num = editor_nrt_content_num.merge(paiban_nrt, how='right', left_on='编辑', right_on='值班人员')
#result_nrt_content_num = result_nrt_content_num[['值班人员','审核文章量']].fillna(0)
#result_nrt_content_num = result_nrt_content_num.rename(columns={'值班人员': '非实时值班编辑'})
result_nrt_content_num = editor_nrt_content_num[['编辑','审核文章量']]

'''
data_bj_result2 = data_bj_result
data_bj_result2['日期']=(datetime.date.today() + datetime.timedelta(days=dd))
data_bj_result2['辅助1'] = data_bj_result2['日期'] + data_bj_result2['早晚班']
'''

'''

#三个省份的监测
showPerCapita = provice_a.copy()
shandong_result = showPerCapita.query("省份=='广东省' or 省份=='浙江省' or 省份=='江苏省'")
cols = ['已完成','文章数','总展示PV','人均展示次数','PV点击率','省份']
shandong_result = shandong_result[cols]
shandong_result = shandong_result.rename(columns={'已完成':'打开UV'} )
shandong_result['日期'] = (datetime.date.today() + datetime.timedelta(days=dd)).strftime('%Y/%m/%d')     
shandong_result['辅助列'] = ((datetime.date.today() + datetime.timedelta(days=dd)).strftime('%Y%m%d')) + shandong_result['省份']
shandong_order = ['辅助列','日期','打开UV','总展示PV', '人均展示次数', '文章数','PV点击率','省份']
shandong_result = shandong_result[shandong_order]
'''
#6.结果
writer=pd.ExcelWriter(str(date_now) + "PUSH表.xlsx")

data_push.to_excel(excel_writer = writer,sheet_name = str(date_now)+'push日报',index = 0)
data_jingbian_notjingbian.to_excel(excel_writer = writer,sheet_name = str(date_now)+'push日报',startrow = 9,index = 0)
data_xz_1.to_excel(excel_writer = writer,sheet_name = str(date_now)+'push日报',startrow = 14,index = 0)
data_xz_2.to_excel(excel_writer = writer,sheet_name = str(date_now)+'push日报',startrow = 20,index = 0)


data_8_result = data_8_result.drop('总到达量', axis=1)
data_7_result.to_excel(excel_writer = writer,sheet_name = '全量PUSH',index = 0)
#data_7_result.to_excel("全量PUSH.xlsx",index = 0)
data_8_result.to_excel(excel_writer = writer,sheet_name = '个性化PUSH',index = 0)
#data_8_result.to_excel("个性化PUSH.xlsx",index = 0)
contribute_result.to_excel(excel_writer = writer,sheet_name = '编辑贡献打开率',index = 0)
#writer.save()
#writer.close()
bd_final_result.to_excel(excel_writer = writer,sheet_name = '编辑贡献打开率',startrow =result.shape[0]+5,index = 0)

data_bj_result.to_excel(excel_writer = writer,sheet_name = '编辑贡献打开率',startrow =result.shape[0]+bd_result.shape[0]+10,index = 0)
result_nrt_content_num.to_excel(excel_writer = writer,sheet_name = '编辑贡献打开率',startrow =result.shape[0]+bd_result.shape[0]+data_bj_result.shape[0]+15,index = 0)
#shandong_result.to_excel(excel_writer = writer,sheet_name = '编辑贡献打开率',startrow = result.shape[0]+bd_result.shape[0]+data_bj_result.shape[0] + 15,index = 0)
writer.close()


